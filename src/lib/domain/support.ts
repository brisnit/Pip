/**
 * Prototype intervention model.
 *
 * Also a pure function: given a readiness reading and a catalogue of what the
 * professor has actually published, propose support pathways. It never invents a
 * resource — every curriculum recommendation points at a real row in the course.
 *
 * The tone rule matters as much as the logic: each recommendation says why it was
 * suggested and what the concrete next step is, and never characterises the
 * student.
 */
import type { ObjectiveEvidence, ReadinessResult } from "./readiness";
import type { Priority, SupportPathway } from "./vocabulary";

export type SegmentRef = {
  objectiveId: string | null;
  conceptId: string | null;
  lectureId: string;
  lectureTitle: string;
  segmentId: string;
  heading: string;
  atSeconds: number;
};

export type MaterialRef = {
  objectiveId: string | null;
  conceptId: string | null;
  materialId: string;
  title: string;
  contentTypeLabel: string;
};

export type SupportCatalog = {
  courseTitle: string;
  segments: SegmentRef[];
  materials: MaterialRef[];
  practiceAssessment: { id: string; title: string } | null;
  upcomingAssessment: {
    id: string;
    title: string;
    scheduledAt: string | null;
  } | null;
  studyGuides: { materialId: string; title: string }[];
  taName: string;
  professorName: string;
};

export type DraftRecommendation = {
  pathway: SupportPathway;
  title: string;
  rationale: string;
  nextStep: string;
  priority: Priority;
  objectiveId: string | null;
  conceptId: string | null;
  lectureId: string | null;
  materialId: string | null;
  position: number;
};

function describeEvidence(row: ObjectiveEvidence): string {
  const parts: string[] = [];
  if (row.answered > 0) {
    parts.push(
      `${row.correct} of ${row.answered} related question${
        row.answered === 1 ? "" : "s"
      } answered correctly`,
    );
  }
  if (row.confusingMarkers > 0) {
    parts.push(
      `${row.confusingMarkers} lecture moment${
        row.confusingMarkers === 1 ? "" : "s"
      } marked confusing`,
    );
  }
  if (row.averageConfidence !== null && row.averageConfidence <= 3) {
    parts.push(
      `confidence reported at ${row.averageConfidence.toFixed(1)} out of 5`,
    );
  }
  return parts.length > 0 ? parts.join(", ") : "limited recorded activity";
}

/**
 * Builds a prioritised support plan. Deterministic: the same readiness reading
 * and catalogue always produce the same plan, in the same order.
 */
export function recommendSupport(
  readiness: ReadinessResult,
  catalog: SupportCatalog,
): DraftRecommendation[] {
  const drafts: DraftRecommendation[] = [];
  const push = (d: Omit<DraftRecommendation, "position">) =>
    drafts.push({ ...d, position: drafts.length });

  // Nothing to work with yet — point at participation, not intervention.
  if (readiness.status === "insufficient_data") {
    const firstSegment = catalog.segments[0];
    push({
      pathway: "curriculum",
      title: firstSegment
        ? `Start with "${firstSegment.heading}"`
        : "Open the most recent lecture",
      rationale:
        "There isn't enough recorded activity yet to say where you stand. Working through one lecture section with the comprehension checks will give you — and your professor — something real to look at.",
      nextStep: firstSegment
        ? `Open ${firstSegment.lectureTitle} and work through the section on ${firstSegment.heading}, answering the comprehension checks as they appear.`
        : "Open the course lecture list and work through the most recent lecture.",
      priority: "high",
      objectiveId: firstSegment?.objectiveId ?? null,
      conceptId: null,
      lectureId: firstSegment?.lectureId ?? null,
      materialId: null,
    });
    return drafts;
  }

  const needsReview = readiness.objectives
    .filter((o) => o.standing === "needs_review")
    .sort((a, b) => {
      const aAcc = a.answered > 0 ? a.correct / a.answered : 1;
      const bAcc = b.answered > 0 ? b.correct / b.answered : 1;
      if (aAcc !== bAcc) return aAcc - bAcc;
      return b.confusingMarkers - a.confusingMarkers;
    });

  const developing = readiness.objectives.filter(
    (o) => o.standing === "developing",
  );

  // 1. Curriculum: revisit the specific lecture section behind the weakest
  //    objective. Highest-value, lowest-friction action.
  for (const row of needsReview.slice(0, 2)) {
    const segment =
      catalog.segments.find((s) => s.objectiveId === row.objective.id) ??
      catalog.segments.find((s) =>
        row.confusingConcepts.length > 0 && s.conceptId
          ? row.confusingConcepts.includes(s.heading)
          : false,
      );

    push({
      pathway: "curriculum",
      title: segment
        ? `Review the lecture segment on ${segment.heading}`
        : `Review the material on ${row.objective.text}`,
      rationale: `Recommended because of ${describeEvidence(row)} for "${
        row.objective.text
      }".`,
      nextStep: segment
        ? `Rewatch ${segment.lectureTitle} from ${formatClock(
            segment.atSeconds,
          )} and re-read the student notes for that section.`
        : `Re-read the course material tagged to "${row.objective.text}".`,
      priority: "high",
      objectiveId: row.objective.id,
      conceptId: segment?.conceptId ?? null,
      lectureId: segment?.lectureId ?? null,
      materialId: null,
    });

    const reading = catalog.materials.find(
      (m) => m.objectiveId === row.objective.id,
    );
    if (reading) {
      push({
        pathway: "curriculum",
        title: `Read "${reading.title}"`,
        rationale: `Your professor tagged this ${reading.contentTypeLabel.toLowerCase()} to "${
          row.objective.text
        }", the objective with the weakest evidence so far.`,
        nextStep: `Work through "${reading.title}" and add one note on how it answers the part you marked confusing.`,
        priority: "medium",
        objectiveId: row.objective.id,
        conceptId: null,
        lectureId: null,
        materialId: reading.materialId,
      });
    }
  }

  // 2. Curriculum: a short practice set, so the next reading isn't guesswork.
  if (catalog.practiceAssessment && needsReview.length > 0) {
    push({
      pathway: "curriculum",
      title: `Complete the practice review: ${catalog.practiceAssessment.title}`,
      rationale:
        "A short practice set is the fastest way to tell the difference between a gap in understanding and a gap in recall.",
      nextStep: `Answer the practice questions and record a confidence rating for each. Your responses update your readiness view immediately.`,
      priority: needsReview.length > 1 ? "high" : "medium",
      objectiveId: needsReview[0]?.objective.id ?? null,
      conceptId: null,
      lectureId: null,
      materialId: null,
    });
  }

  const studyGuide = catalog.studyGuides[0];
  if (studyGuide && (needsReview.length > 0 || developing.length > 1)) {
    push({
      pathway: "curriculum",
      title: `Work through "${studyGuide.title}"`,
      rationale:
        "This guide was written by your professor and covers the objectives currently showing the weakest evidence.",
      nextStep: `Open "${studyGuide.title}" and note anything it raises that you cannot yet explain in your own words.`,
      priority: "low",
      objectiveId: null,
      conceptId: null,
      lectureId: null,
      materialId: studyGuide.materialId,
    });
  }

  // 3. Teaching assistant: once two or more objectives are weak, self-study
  //    alone tends to stall.
  if (needsReview.length >= 2 || readiness.status === "support_recommended") {
    const topics = needsReview
      .slice(0, 3)
      .map((r) => r.objective.text)
      .join("; ");
    push({
      pathway: "teaching_assistant",
      title: `Bring these topics to ${catalog.taName}`,
      rationale: `More than one objective is showing weak evidence at the same time (${
        needsReview.length
      } in total). A short conversation usually resolves this faster than re-reading.`,
      nextStep: topics
        ? `Submit a question naming these topics: ${topics}.`
        : "Submit a question describing where you got stuck.",
      priority: readiness.status === "support_recommended" ? "high" : "medium",
      objectiveId: needsReview[0]?.objective.id ?? null,
      conceptId: null,
      lectureId: null,
      materialId: null,
    });
  }

  // 4. Tutoring: sustained difficulty across the course.
  if (
    readiness.status === "support_recommended" &&
    (readiness.score === null || readiness.score < 0.45)
  ) {
    push({
      pathway: "tutoring",
      title: "Request a tutoring session",
      rationale:
        "The gaps span several objectives rather than one topic, which usually means working through the material with someone will help more than another pass alone.",
      nextStep:
        "Request a session and confirm the topics. The request includes a preparation summary so your tutor arrives already knowing what to cover.",
      priority: "high",
      objectiveId: null,
      conceptId: null,
      lectureId: null,
      materialId: null,
    });
  }

  // 5. Office hours: professor-level conversation, especially before an exam.
  if (
    readiness.status === "support_recommended" ||
    (readiness.status === "needs_review" && catalog.upcomingAssessment)
  ) {
    push({
      pathway: "office_hours",
      title: `Request office hours with ${catalog.professorName}`,
      rationale: catalog.upcomingAssessment
        ? `${catalog.upcomingAssessment.title} is coming up and covers the objectives currently showing the weakest evidence.`
        : "A short conversation with your professor is the most direct way to check whether you are reading the material the way the course intends.",
      nextStep:
        "Request a meeting and select the topics. Both you and your professor receive the same short preparation summary.",
      priority: readiness.status === "support_recommended" ? "medium" : "low",
      objectiveId: null,
      conceptId: null,
      lectureId: null,
      materialId: null,
    });
  }

  // 6. Peer study: low reported confidence, even where accuracy is fine.
  const confidenceSignal = readiness.signals.find(
    (s) => s.kind === "self_confidence",
  );
  if (
    confidenceSignal &&
    confidenceSignal.value !== null &&
    confidenceSignal.value < 0.6
  ) {
    push({
      pathway: "peer_study",
      title: "Join a study group for this module",
      rationale:
        "Your reported confidence is lower than your answers suggest it needs to be. Explaining a concept aloud to a classmate is the usual fix for that gap.",
      nextStep:
        "Join a group and take one concept you can nearly explain. Try teaching it, and note where you stall.",
      priority: "low",
      objectiveId: null,
      conceptId: null,
      lectureId: null,
      materialId: null,
    });
  }

  // 7. A student whose signals look fine still gets a next step. An empty plan
  //    reads as "nothing to do", which is rarely true before an exam.
  if (drafts.length === 0) {
    const guide = catalog.studyGuides[0];
    if (catalog.upcomingAssessment) {
      push({
        pathway: "curriculum",
        title: `Keep pace with ${catalog.upcomingAssessment.title}`,
        rationale:
          "Nothing in your recorded activity suggests a gap. This is maintenance, not remediation.",
        nextStep: guide
          ? `Work through "${guide.title}" once before ${catalog.upcomingAssessment.title}, and note anything you cannot yet explain out loud.`
          : `Re-read your own notes for the module before ${catalog.upcomingAssessment.title} and note anything you cannot yet explain out loud.`,
        priority: "low",
        objectiveId: null,
        conceptId: null,
        lectureId: null,
        materialId: guide?.materialId ?? null,
      });
    } else if (guide) {
      push({
        pathway: "curriculum",
        title: `Work through "${guide.title}"`,
        rationale:
          "Nothing in your recorded activity suggests a gap. This keeps the material fresh.",
        nextStep: `Read "${guide.title}" and note anything you cannot yet explain out loud.`,
        priority: "low",
        objectiveId: null,
        conceptId: null,
        lectureId: null,
        materialId: guide.materialId,
      });
    }
  }

  return drafts;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

export function parseClock(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const parts = trimmed.split(":").map((p) => p.trim());
  if (parts.some((p) => !/^\d+$/.test(p)) || parts.length > 3) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}
