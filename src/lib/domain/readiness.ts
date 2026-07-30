/**
 * Prototype readiness model.
 *
 * This is a *pure* function of recorded signals. It reads no globals and touches
 * no database, so it can be reasoned about and tested directly, and so every
 * status it produces can be explained back to the professor and the student.
 *
 * Read docs/student-readiness-model.md before changing any weight or threshold.
 * Two rules are load-bearing:
 *
 *  1. Readiness is never computed from attendance or presence alone.
 *  2. Asking questions is *never* scored against a student. Curiosity is context,
 *     not evidence of a deficit.
 */
import {
  CONFIDENCE_COPY,
  type EstimateConfidence,
  type Marker,
  type QuestionKind,
  READINESS_PRESENTATION,
  type ReadinessStatus,
} from "./vocabulary";

// Inputs ---------------------------------------------------------------------

export type ScoredResponse = {
  objectiveId: string | null;
  conceptName: string | null;
  isCorrect: boolean;
  source: "comprehension_check" | "assessment";
};

export type ConfidenceDatum = {
  objectiveId: string | null;
  /** 1 (not at all confident) … 5 (very confident) */
  level: number;
};

export type MarkerDatum = {
  objectiveId: string | null;
  conceptName: string | null;
  marker: Marker;
};

export type ObjectiveRef = {
  id: string;
  code: string;
  text: string;
  moduleTitle: string | null;
};

export type ReadinessInput = {
  courseId: string;
  studentId: string;
  objectives: ObjectiveRef[];
  scored: ScoredResponse[];
  confidence: ConfidenceDatum[];
  markers: MarkerDatum[];
  questions: { kind: QuestionKind; objectiveId: string | null }[];
  /** Lectures visible to students, and how many this student actually worked in. */
  lecturesAvailable: number;
  lecturesEngaged: number;
  /** Published comprehension checks across the course, and how many were answered. */
  checksPublished: number;
  checksAnswered: number;
  /** Count of support requests this student submitted themselves. */
  helpRequests: number;
  lastActivityAt: string | null;
  /** Active professor override, if any. */
  override: {
    status: ReadinessStatus;
    reason: string;
    setByName: string;
    createdAt: string;
  } | null;
};

// Outputs --------------------------------------------------------------------

export type SignalKind =
  | "comprehension_checks"
  | "practice_assessment"
  | "self_confidence"
  | "confusion_markers"
  | "participation_breadth"
  | "missing_activity"
  | "clarification_requests"
  | "help_request";

export type ReadinessSignal = {
  kind: SignalKind;
  label: string;
  /** Plain-language description of what was actually observed. */
  detail: string;
  /** Contribution to the composite score. 0 means "context only". */
  weight: number;
  /** Normalised 0–1 reading, or null when there is no evidence for this signal. */
  value: number | null;
  /** How many recorded data points back this signal. */
  evidence: number;
  direction: "positive" | "negative" | "neutral" | "context";
};

export type ObjectiveStanding =
  | "understood"
  | "developing"
  | "needs_review"
  | "unknown";

export const OBJECTIVE_STANDING_LABELS: Record<ObjectiveStanding, string> = {
  understood: "Comfortable",
  developing: "Developing",
  needs_review: "Needs review",
  unknown: "Not enough information yet",
};

export type ObjectiveEvidence = {
  objective: ObjectiveRef;
  answered: number;
  correct: number;
  clearMarkers: number;
  confusingMarkers: number;
  averageConfidence: number | null;
  standing: ObjectiveStanding;
  /** Concepts within this objective that were marked confusing. */
  confusingConcepts: string[];
};

export type ReadinessResult = {
  /** Final status shown in the UI — the override when one is active. */
  status: ReadinessStatus;
  /** What the signals alone produced, retained even when overridden. */
  computedStatus: ReadinessStatus;
  /** 0–1 composite, or null when there is not enough evidence. */
  score: number | null;
  confidence: EstimateConfidence;
  confidenceCopy: string;
  evidenceCount: number;
  signals: ReadinessSignal[];
  /** Signals that carried weight, strongest contributor first. */
  drivers: ReadinessSignal[];
  strengths: ObjectiveEvidence[];
  gaps: ObjectiveEvidence[];
  unassessed: ObjectiveEvidence[];
  objectives: ObjectiveEvidence[];
  /** Short "why this status" bullets, ready to render. */
  reasons: string[];
  override: ReadinessInput["override"];
  lastActivityAt: string | null;
};

// Model constants ------------------------------------------------------------

/**
 * Weights are relative, and renormalised across whichever signals actually have
 * evidence — so a student with no assessment data is not penalised for it.
 */
export const SIGNAL_WEIGHTS: Record<SignalKind, number> = {
  comprehension_checks: 0.3,
  practice_assessment: 0.25,
  self_confidence: 0.15,
  confusion_markers: 0.15,
  participation_breadth: 0.08,
  missing_activity: 0.07,
  // Deliberately zero: shown as context, never scored. See docs.
  clarification_requests: 0,
  help_request: 0,
};

export const THRESHOLDS = {
  /** score ≥ this → on track */
  onTrack: 0.75,
  /** score ≥ this → needs review; below → support recommended */
  needsReview: 0.5,
  /** Below this many evidence points, we decline to give a status. */
  minimumEvidence: 3,
  /** Evidence needed before the estimate is described as moderate / high. */
  moderateEvidence: 6,
  highEvidence: 18,
  /** A student asking for help caps the status at needs_review at best. */
  helpRequestCeiling: 0.85,
} as const;

// Implementation -------------------------------------------------------------

function ratio(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return part / whole;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function buildSignals(input: ReadinessInput): ReadinessSignal[] {
  const checks = input.scored.filter((s) => s.source === "comprehension_check");
  const assessed = input.scored.filter((s) => s.source === "assessment");

  const checkCorrect = checks.filter((s) => s.isCorrect).length;
  const assessedCorrect = assessed.filter((s) => s.isCorrect).length;

  const clear = input.markers.filter((m) => m.marker === "clear").length;
  const confusing = input.markers.filter((m) => m.marker === "confusing").length;

  const confidenceAvg =
    input.confidence.length > 0
      ? input.confidence.reduce((sum, c) => sum + c.level, 0) /
        input.confidence.length
      : null;

  const lowConfidenceCount = input.confidence.filter((c) => c.level <= 2).length;

  const clarifications = input.questions.filter(
    (q) => q.kind === "request_simpler" || q.kind === "request_example",
  ).length;

  const signals: ReadinessSignal[] = [
    {
      kind: "comprehension_checks",
      label: "Comprehension checks",
      detail:
        checks.length === 0
          ? "No comprehension checks answered yet."
          : `${checkCorrect} of ${checks.length} in-lecture comprehension question${
              checks.length === 1 ? "" : "s"
            } answered correctly.`,
      weight: SIGNAL_WEIGHTS.comprehension_checks,
      value: ratio(checkCorrect, checks.length),
      evidence: checks.length,
      direction:
        checks.length === 0
          ? "neutral"
          : checkCorrect / checks.length >= THRESHOLDS.onTrack
            ? "positive"
            : "negative",
    },
    {
      kind: "practice_assessment",
      label: "Practice and assessment questions",
      detail:
        assessed.length === 0
          ? "No practice or assessment questions completed yet."
          : `${assessedCorrect} of ${assessed.length} assessment question${
              assessed.length === 1 ? "" : "s"
            } answered correctly.`,
      weight: SIGNAL_WEIGHTS.practice_assessment,
      value: ratio(assessedCorrect, assessed.length),
      evidence: assessed.length,
      direction:
        assessed.length === 0
          ? "neutral"
          : assessedCorrect / assessed.length >= THRESHOLDS.onTrack
            ? "positive"
            : "negative",
    },
    {
      kind: "self_confidence",
      label: "Self-reported confidence",
      detail:
        confidenceAvg === null
          ? "No confidence ratings recorded yet."
          : `Average confidence ${confidenceAvg.toFixed(1)} out of 5 across ${
              input.confidence.length
            } rating${input.confidence.length === 1 ? "" : "s"}${
              lowConfidenceCount > 0
                ? `, including ${lowConfidenceCount} low rating${
                    lowConfidenceCount === 1 ? "" : "s"
                  }`
                : ""
            }.`,
      weight: SIGNAL_WEIGHTS.self_confidence,
      value: confidenceAvg === null ? null : (confidenceAvg - 1) / 4,
      evidence: input.confidence.length,
      direction:
        confidenceAvg === null
          ? "neutral"
          : confidenceAvg >= 4
            ? "positive"
            : confidenceAvg <= 2.5
              ? "negative"
              : "neutral",
    },
    {
      kind: "confusion_markers",
      label: "Clear and confusing markers",
      detail:
        clear + confusing === 0
          ? "No lecture moments marked clear or confusing yet."
          : `${clear} moment${clear === 1 ? "" : "s"} marked clear, ${confusing} marked confusing.`,
      weight: SIGNAL_WEIGHTS.confusion_markers,
      value: ratio(clear, clear + confusing),
      evidence: clear + confusing,
      direction:
        clear + confusing === 0
          ? "neutral"
          : confusing > clear
            ? "negative"
            : "positive",
    },
    {
      kind: "participation_breadth",
      label: "Lecture participation",
      detail:
        input.lecturesAvailable === 0
          ? "No lectures published yet."
          : `Worked inside ${input.lecturesEngaged} of ${input.lecturesAvailable} published lecture${
              input.lecturesAvailable === 1 ? "" : "s"
            }.`,
      weight: SIGNAL_WEIGHTS.participation_breadth,
      value: ratio(input.lecturesEngaged, input.lecturesAvailable),
      evidence: input.lecturesEngaged,
      direction:
        input.lecturesAvailable === 0
          ? "neutral"
          : input.lecturesEngaged >= input.lecturesAvailable
            ? "positive"
            : "negative",
    },
    {
      kind: "missing_activity",
      label: "Outstanding course activity",
      detail:
        input.checksPublished === 0
          ? "No comprehension checks published yet."
          : `${input.checksAnswered} of ${input.checksPublished} published comprehension check${
              input.checksPublished === 1 ? "" : "s"
            } completed.`,
      weight: SIGNAL_WEIGHTS.missing_activity,
      value: ratio(input.checksAnswered, input.checksPublished),
      evidence: input.checksPublished > 0 ? 1 : 0,
      direction:
        input.checksPublished === 0
          ? "neutral"
          : input.checksAnswered >= input.checksPublished
            ? "positive"
            : "negative",
    },
    {
      kind: "clarification_requests",
      label: "Questions and clarification requests",
      detail:
        input.questions.length === 0
          ? "No questions submitted yet."
          : `${input.questions.length} question${
              input.questions.length === 1 ? "" : "s"
            } submitted${
              clarifications > 0
                ? `, ${clarifications} asking for a simpler explanation or an example`
                : ""
            }. Asking questions is not counted against readiness.`,
      weight: 0,
      value: null,
      evidence: input.questions.length,
      direction: "context",
    },
    {
      kind: "help_request",
      label: "Student request for support",
      detail:
        input.helpRequests === 0
          ? "No support requests submitted."
          : `${input.helpRequests} support request${
              input.helpRequests === 1 ? "" : "s"
            } submitted by the student. A direct request always takes priority over the computed score.`,
      weight: 0,
      value: null,
      evidence: input.helpRequests,
      direction: input.helpRequests > 0 ? "negative" : "neutral",
    },
  ];

  return signals;
}

function buildObjectiveEvidence(input: ReadinessInput): ObjectiveEvidence[] {
  return input.objectives.map((objective) => {
    const scored = input.scored.filter((s) => s.objectiveId === objective.id);
    const answered = scored.length;
    const correct = scored.filter((s) => s.isCorrect).length;

    const markers = input.markers.filter((m) => m.objectiveId === objective.id);
    const clearMarkers = markers.filter((m) => m.marker === "clear").length;
    const confusingMarkers = markers.filter(
      (m) => m.marker === "confusing",
    ).length;
    const confusingConcepts = Array.from(
      new Set(
        markers
          .filter((m) => m.marker === "confusing" && m.conceptName)
          .map((m) => m.conceptName as string),
      ),
    );

    const confidences = input.confidence.filter(
      (c) => c.objectiveId === objective.id,
    );
    const averageConfidence =
      confidences.length > 0
        ? confidences.reduce((sum, c) => sum + c.level, 0) / confidences.length
        : null;

    const evidence = answered + clearMarkers + confusingMarkers + confidences.length;

    let standing: ObjectiveStanding = "unknown";
    if (evidence >= 2) {
      const accuracy = answered > 0 ? correct / answered : null;
      const confusionHeavy = confusingMarkers > clearMarkers;
      const lowConfidence = averageConfidence !== null && averageConfidence <= 2.5;

      if (accuracy !== null && accuracy >= THRESHOLDS.onTrack && !confusionHeavy) {
        standing = lowConfidence ? "developing" : "understood";
      } else if (accuracy !== null && accuracy < THRESHOLDS.needsReview) {
        standing = "needs_review";
      } else if (confusionHeavy || lowConfidence) {
        standing = "needs_review";
      } else if (accuracy !== null) {
        standing = "developing";
      } else {
        standing = confusingMarkers > 0 ? "needs_review" : "developing";
      }
    }

    return {
      objective,
      answered,
      correct,
      clearMarkers,
      confusingMarkers,
      averageConfidence,
      standing,
      confusingConcepts,
    };
  });
}

function evidenceTotal(input: ReadinessInput): number {
  return (
    input.scored.length +
    input.confidence.length +
    input.markers.length +
    Math.min(input.lecturesEngaged, input.lecturesAvailable)
  );
}

function estimateConfidence(evidence: number): EstimateConfidence {
  if (evidence >= THRESHOLDS.highEvidence) return "high";
  if (evidence >= THRESHOLDS.moderateEvidence) return "moderate";
  return "low";
}

function statusFromScore(score: number): ReadinessStatus {
  if (score >= THRESHOLDS.onTrack) return "on_track";
  if (score >= THRESHOLDS.needsReview) return "needs_review";
  return "support_recommended";
}

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const signals = buildSignals(input);
  const objectives = buildObjectiveEvidence(input);
  const evidenceCount = evidenceTotal(input);

  const weighted = signals.filter((s) => s.weight > 0 && s.value !== null);
  const weightTotal = weighted.reduce((sum, s) => sum + s.weight, 0);

  const hasDirectEvidence = input.scored.length > 0 || input.confidence.length > 0;
  const enoughEvidence =
    evidenceCount >= THRESHOLDS.minimumEvidence &&
    hasDirectEvidence &&
    weightTotal > 0;

  let score: number | null = null;
  let computedStatus: ReadinessStatus = "insufficient_data";

  if (enoughEvidence) {
    score =
      weighted.reduce((sum, s) => sum + s.weight * (s.value as number), 0) /
      weightTotal;
    computedStatus = statusFromScore(score);

    // A student who asks for help is never left on "on track" purely because
    // their numbers look fine. The request itself is the signal that matters.
    if (input.helpRequests > 0 && score >= THRESHOLDS.helpRequestCeiling) {
      computedStatus = "needs_review";
    } else if (input.helpRequests > 0 && computedStatus === "on_track") {
      computedStatus = "support_recommended";
    }
  }

  const confidence = enoughEvidence
    ? estimateConfidence(evidenceCount)
    : "low";

  const status = input.override?.status ?? computedStatus;

  const drivers = weighted
    .slice()
    .sort((a, b) => {
      const impactA = a.weight * (1 - (a.value as number));
      const impactB = b.weight * (1 - (b.value as number));
      return impactB - impactA;
    })
    .filter((s) => s.direction === "negative" || s.direction === "positive");

  const reasons = buildReasons(input, signals, objectives, {
    status,
    computedStatus,
    score,
    enoughEvidence,
  });

  return {
    status,
    computedStatus,
    score,
    confidence,
    confidenceCopy: CONFIDENCE_COPY[confidence],
    evidenceCount,
    signals,
    drivers,
    strengths: objectives.filter((o) => o.standing === "understood"),
    gaps: objectives.filter(
      (o) => o.standing === "needs_review" || o.standing === "developing",
    ),
    unassessed: objectives.filter((o) => o.standing === "unknown"),
    objectives,
    reasons,
    override: input.override,
    lastActivityAt: input.lastActivityAt,
  };
}

function buildReasons(
  input: ReadinessInput,
  signals: ReadinessSignal[],
  objectives: ObjectiveEvidence[],
  ctx: {
    status: ReadinessStatus;
    computedStatus: ReadinessStatus;
    score: number | null;
    enoughEvidence: boolean;
  },
): string[] {
  const reasons: string[] = [];

  if (input.override) {
    reasons.push(
      `Status set manually by ${input.override.setByName}: "${input.override.reason}"`,
    );
  }

  if (!ctx.enoughEvidence) {
    reasons.push(
      "Not enough recorded activity yet to estimate readiness. This is a gap in the data, not a judgement about the student.",
    );
    if (input.lecturesAvailable > input.lecturesEngaged) {
      reasons.push(
        `${input.lecturesAvailable - input.lecturesEngaged} published lecture${
          input.lecturesAvailable - input.lecturesEngaged === 1 ? "" : "s"
        } not opened yet.`,
      );
    }
    return reasons;
  }

  const byKind = new Map(signals.map((s) => [s.kind, s]));

  const checks = byKind.get("comprehension_checks")!;
  if (checks.evidence > 0) reasons.push(checks.detail);

  const assessment = byKind.get("practice_assessment")!;
  if (assessment.evidence > 0) reasons.push(assessment.detail);

  const confidenceSignal = byKind.get("self_confidence")!;
  if (confidenceSignal.evidence > 0) reasons.push(confidenceSignal.detail);

  const confusion = byKind.get("confusion_markers")!;
  if (confusion.evidence > 0) reasons.push(confusion.detail);

  const missing = byKind.get("missing_activity")!;
  if (missing.value !== null && missing.value < 1) reasons.push(missing.detail);

  const help = byKind.get("help_request")!;
  if (help.evidence > 0) reasons.push(help.detail);

  const gapNames = objectives
    .filter((o) => o.standing === "needs_review")
    .map((o) => o.objective.text);
  if (gapNames.length > 0) {
    reasons.push(
      `Objectives with the weakest evidence: ${gapNames.slice(0, 3).join("; ")}.`,
    );
  }

  if (ctx.score !== null) {
    reasons.push(
      `Composite readiness reading ${pct(ctx.score)} against a ${pct(
        THRESHOLDS.onTrack,
      )} "on track" threshold. This is a prototype signal, not a grade.`,
    );
  }

  return reasons;
}

// Class aggregate ------------------------------------------------------------

export type ClassAggregate = {
  total: number;
  counts: Record<ReadinessStatus, number>;
  shares: Record<ReadinessStatus, number>;
  /** Objectives ranked by how many students show weak evidence. */
  hardestObjectives: {
    objective: ObjectiveRef;
    studentsNeedingReview: number;
    studentsWithEvidence: number;
    accuracy: number | null;
  }[];
  /** Concepts most often marked confusing across the class. */
  confusingConcepts: { name: string; count: number }[];
  averageConfidence: number | null;
  studentsWithoutEnoughData: number;
};

export function aggregateClass(
  results: { studentId: string; result: ReadinessResult }[],
  objectives: ObjectiveRef[],
): ClassAggregate {
  const counts: Record<ReadinessStatus, number> = {
    on_track: 0,
    needs_review: 0,
    support_recommended: 0,
    insufficient_data: 0,
  };

  for (const { result } of results) counts[result.status] += 1;

  const total = results.length;
  const shares = Object.fromEntries(
    (Object.keys(counts) as ReadinessStatus[]).map((k) => [
      k,
      total === 0 ? 0 : counts[k] / total,
    ]),
  ) as Record<ReadinessStatus, number>;

  const hardestObjectives = objectives
    .map((objective) => {
      let studentsNeedingReview = 0;
      let studentsWithEvidence = 0;
      let answered = 0;
      let correct = 0;

      for (const { result } of results) {
        const row = result.objectives.find(
          (o) => o.objective.id === objective.id,
        );
        if (!row) continue;
        if (row.standing !== "unknown") studentsWithEvidence += 1;
        if (row.standing === "needs_review") studentsNeedingReview += 1;
        answered += row.answered;
        correct += row.correct;
      }

      return {
        objective,
        studentsNeedingReview,
        studentsWithEvidence,
        accuracy: answered > 0 ? correct / answered : null,
      };
    })
    .filter((row) => row.studentsWithEvidence > 0)
    .sort((a, b) => {
      if (b.studentsNeedingReview !== a.studentsNeedingReview) {
        return b.studentsNeedingReview - a.studentsNeedingReview;
      }
      return (a.accuracy ?? 1) - (b.accuracy ?? 1);
    });

  const conceptTally = new Map<string, number>();
  for (const { result } of results) {
    for (const row of result.objectives) {
      for (const concept of row.confusingConcepts) {
        conceptTally.set(concept, (conceptTally.get(concept) ?? 0) + 1);
      }
    }
  }

  const confidenceValues = results
    .map(({ result }) => {
      const signal = result.signals.find((s) => s.kind === "self_confidence");
      return signal && signal.value !== null ? signal.value * 4 + 1 : null;
    })
    .filter((v): v is number => v !== null);

  return {
    total,
    counts,
    shares,
    hardestObjectives,
    confusingConcepts: Array.from(conceptTally.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    averageConfidence:
      confidenceValues.length > 0
        ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
        : null,
    studentsWithoutEnoughData: counts.insufficient_data,
  };
}

/** Sort key that puts the students most worth a professor's attention first. */
export function attentionRank(status: ReadinessStatus): number {
  switch (status) {
    case "support_recommended":
      return 0;
    case "needs_review":
      return 1;
    case "insufficient_data":
      return 2;
    case "on_track":
      return 3;
  }
}

export function statusLabel(status: ReadinessStatus): string {
  return READINESS_PRESENTATION[status].label;
}
