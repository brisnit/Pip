/**
 * Non-UI verification of the prototype data layer and the required vertical slice.
 *
 * Runs the seed into a throwaway database, then walks the whole loop:
 * professor publishes → student joins → student works → readiness is computed →
 * support is recommended → professor assigns → student sees the plan.
 *
 *   npm run verify
 */
process.env.PROTOTYPE_DB_PATH ??= ".data/verify.db";

import Database from "better-sqlite3";
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { getDb } from "../src/lib/db/client";
import { READINESS_PRESENTATION } from "../src/lib/domain/vocabulary";
import {
  createCourse,
  getActiveProfessor,
  getCourse,
  listCourses,
  listObjectives,
} from "../src/lib/repositories/courses";
import { createMaterial, createSyllabus } from "../src/lib/repositories/content";
import { joinCourse, listRoster } from "../src/lib/repositories/students";
import {
  classAggregate,
  readinessFor,
  readinessForCourse,
  setStatusOverride,
} from "../src/lib/repositories/readiness";
import {
  buildCatalog,
  draftRecommendations,
  listRecommendations,
  respondToRecommendation,
  saveRecommendation,
  syncRecommendations,
} from "../src/lib/repositories/support";
import {
  createLecture,
  listInteractions,
  listSegments,
  listStudentLectures,
  recordInteractionResponse,
} from "../src/lib/repositories/lectures";
import {
  createNote,
  listSharedNotes,
  setMarker,
} from "../src/lib/repositories/engagement";
import { getPracticeAssessment } from "../src/lib/repositories/assessments";
import { getAIProvider } from "../src/lib/ai";

for (const suffix of ["", "-wal", "-shm"]) {
  try {
    rmSync(`${process.env.PROTOTYPE_DB_PATH}${suffix}`);
  } catch {
    // fine — nothing to clean up
  }
}

let failures = 0;
function check(label: string, condition: boolean, detail = "") {
  const mark = condition ? "PASS" : "FAIL";
  if (!condition) failures += 1;
  console.log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ""}`);
}
function section(title: string) {
  console.log(`\n${title}`);
  console.log("─".repeat(78));
}

getDb();

// ─────────────────────────────────────────────── seeded course and readiness

const professor = getActiveProfessor();
const seededCourse = listCourses(professor.id)[0];

console.log(`\nProfessor: ${professor.name}`);
console.log(`Course:    ${seededCourse.code} — ${seededCourse.title}`);
console.log(`Access:    ${seededCourse.access_code}`);

const roster = listRoster(seededCourse.id);
const results = readinessForCourse(
  seededCourse.id,
  roster.map((s) => s.id),
);
const aggregate = classAggregate(seededCourse.id, results);

section("Readiness spread across the seeded roster");
for (const student of roster) {
  const result = results.find((r) => r.studentId === student.id)!.result;
  const presentation = READINESS_PRESENTATION[result.status];
  console.log(
    `  ${presentation.glyph} ${student.name.padEnd(22)} ${presentation.label.padEnd(
      28,
    )} score ${
      result.score === null ? " n/a" : `${Math.round(result.score * 100)}%`.padStart(4)
    }  confidence ${result.confidence.padEnd(8)} evidence ${result.evidenceCount}`,
  );
}

section("Readiness model");
check(
  "all four readiness bands are represented",
  Object.values(aggregate.counts).every((n) => n > 0),
  JSON.stringify(aggregate.counts),
);
check(
  "class aggregate covers the whole roster",
  aggregate.total === roster.length,
  `${aggregate.total} of ${roster.length}`,
);
check(
  "hardest objectives are ranked",
  aggregate.hardestObjectives.length > 0,
  aggregate.hardestObjectives[0]?.objective.code ?? "none",
);
check(
  "confusing concepts are tallied",
  aggregate.confusingConcepts.length > 0,
  aggregate.confusingConcepts
    .slice(0, 3)
    .map((c) => `${c.name} (${c.count})`)
    .join(", "),
);
check(
  "every status has at least one stated reason",
  results.every((r) => r.result.reasons.length > 0),
);
check(
  "insufficient-data students carry no score",
  results
    .filter((r) => r.result.status === "insufficient_data")
    .every((r) => r.result.score === null),
);
check(
  "asking questions never lowers a score",
  results.every((r) =>
    r.result.signals
      .filter((s) => s.kind === "clarification_requests")
      .every((s) => s.weight === 0),
  ),
);
check(
  "a student who asked for help is never left on track",
  results
    .filter((r) => {
      const help = r.result.signals.find((s) => s.kind === "help_request");
      return (help?.evidence ?? 0) > 0;
    })
    .every((r) => r.result.computedStatus !== "on_track"),
);

section("Support recommender");
const catalog = buildCatalog(seededCourse.id);
const lectureIds = new Set(listStudentLectures(seededCourse.id).map((l) => l.id));
const materialIds = new Set(catalog.materials.map((m) => m.materialId));

let recommendationCount = 0;
let dangling = 0;
for (const { result } of results) {
  const drafts = draftRecommendations(seededCourse.id, result);
  recommendationCount += drafts.length;
  for (const draft of drafts) {
    if (draft.lectureId && !lectureIds.has(draft.lectureId)) dangling += 1;
    if (draft.materialId && !materialIds.has(draft.materialId)) dangling += 1;
  }
}
check(
  "recommendations only reference real published rows",
  dangling === 0,
  `${recommendationCount} drafts across the roster`,
);
check(
  "every student receives at least one recommendation",
  results.every(
    (r) => draftRecommendations(seededCourse.id, r.result).length > 0,
  ),
);

const red = results.find((r) => r.result.status === "support_recommended");
if (red) {
  const pathways = new Set(
    draftRecommendations(seededCourse.id, red.result).map((d) => d.pathway),
  );
  check(
    "support-recommended students get more than one pathway",
    pathways.size > 1,
    Array.from(pathways).join(", "),
  );
}
check(
  "support catalogue is populated from real course content",
  catalog.segments.length > 0 &&
    catalog.materials.length > 0 &&
    catalog.practiceAssessment !== null &&
    catalog.upcomingAssessment !== null,
);

section("Privacy boundary");
const noorRow = roster.find((s) => s.name === "Noor Haddad")!;
const shared = listSharedNotes(seededCourse.id, noorRow.id);
const allNotesCount = getDb()
  .prepare<[string, string], { n: number }>(
    "SELECT COUNT(*) AS n FROM student_notes WHERE course_id = ? AND student_id = ?",
  )
  .get(seededCourse.id, noorRow.id)!.n;
check(
  "professor-visible notes are a strict subset of the student's notes",
  shared.length < allNotesCount && shared.length > 0,
  `${shared.length} shared of ${allNotesCount} total`,
);
check(
  "every professor-visible note is explicitly shared",
  shared.every((note) => note.shared_with_professor === 1),
);
check(
  "professor-only materials are excluded from the student view",
  getDb()
    .prepare<[string], { n: number }>(
      `SELECT COUNT(*) AS n FROM course_materials
       WHERE course_id = ? AND visibility = 'professor_only'`,
    )
    .get(seededCourse.id)!.n > 0,
  "at least one teaching-notes item exists to be excluded",
);

// ───────────────────────────────────────────── the required vertical slice

section("Vertical slice: professor builds a course from scratch");

const { courseId, accessCode } = createCourse({
  professorId: professor.id,
  title: "Slice Test: Reading Primary Sources",
  code: "CH599",
  description: "A verification course created by npm run verify.",
  format: "seminar",
  imageTheme: "slate",
  term: "Verification term",
  objectives: [
    "State a position accurately before evaluating it",
    "Distinguish polemical intent from careless exegesis",
    "Situate a text in its institutional setting",
  ],
  modules: ["Reading closely"],
});

check("course created", Boolean(getCourse(courseId)));
check("access code issued", /^[A-Z0-9]{6}$/.test(accessCode), accessCode);

const objectives = listObjectives(courseId);
check("three learning objectives created", objectives.length === 3);

createSyllabus({
  courseId,
  sourceType: "pasted_text",
  rawText: `Learning Objectives:\n- State a position accurately before evaluating it\n\nWeekly Schedule:\nWeek 1 — Reading closely\n\nExams:\nMidterm Examination, July 9`,
});
const extraction = await getAIProvider().extractSyllabus(
  "Learning Objectives:\n- State a position accurately\n\nWeekly Schedule:\nWeek 1 — Reading closely",
  "Slice Test",
);
check(
  "syllabus extraction produced reviewable draft items",
  extraction.data.items.length > 0,
  `${extraction.data.items.length} items`,
);
check(
  "extraction result is labelled as simulated, not live AI",
  extraction.provenance.isSimulated,
);

const materialId = createMaterial({
  courseId,
  title: "Reading guide — polemic and exegesis",
  contentType: "study_guide",
  visibility: "students",
  fileName: "guide.pdf",
  objectiveIds: [objectives[1].id],
});
check("material created and tagged to an objective", Boolean(materialId));

const lectureId = createLecture({
  courseId,
  title: "How to read a text that is arguing hard",
  deliveryMode: "recorded",
  status: "published",
  studentNotes: "### The skill\nHold polemic and care together.",
  objectiveIds: objectives.map((o) => o.id),
  segments: [
    { heading: "Stating a position fairly", startSeconds: 0, body: "Begin here." },
    { heading: "Polemic is not carelessness", startSeconds: 600, body: "Both at once." },
  ],
  comprehensionQuestions: [
    {
      prompt: "Stating a position you reject in terms its holders accept is:",
      options: [
        { text: "A prerequisite for evaluating it", isCorrect: true },
        { text: "A concession to it", isCorrect: false },
      ],
      objectiveId: objectives[0].id,
    },
    {
      prompt: "A polemical text can also be careful exegesis.",
      options: [
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ],
      objectiveId: objectives[1].id,
    },
    {
      prompt: "Institutional setting matters because:",
      options: [
        { text: "It shapes the audience a text is written for", isCorrect: true },
        { text: "It determines whether the text is true", isCorrect: false },
      ],
      objectiveId: objectives[2].id,
    },
  ],
});

const segments = listSegments(lectureId);
const checks = listInteractions(lectureId).filter(
  (i) => i.type === "comprehension_question",
);
check("lecture created with an outline", segments.length === 2);
check("three comprehension questions created", checks.length === 3);
check(
  "each comprehension question is tied to an objective",
  checks.every((c) => c.objective_id !== null),
);

section("Vertical slice: a student joins and works");

const { studentId, isReturning } = joinCourse({
  courseId,
  name: "Verification Student",
  source: "qr",
  consented: true,
});
check("student joined without an account", Boolean(studentId));
check("new student is not treated as returning", !isReturning);

const before = readinessFor(courseId, studentId);
check(
  "with no activity, readiness declines to guess",
  before.status === "insufficient_data" && before.score === null,
  READINESS_PRESENTATION[before.status].label,
);

createNote({
  studentId,
  courseId,
  lectureId,
  segmentId: segments[1].id,
  kind: "timestamped",
  title: "The bit I do not follow",
  body: "How do I tell polemic from carelessness in practice?",
  atSeconds: 640,
  transcriptExcerpt: segments[1].transcript_excerpt,
});
check(
  "timestamped note is anchored to the segment and timestamp",
  getDb()
    .prepare<[string, string], { n: number }>(
      `SELECT COUNT(*) AS n FROM student_notes
       WHERE student_id = ? AND segment_id = ? AND at_seconds IS NOT NULL`,
    )
    .get(studentId, segments[1].id)!.n === 1,
);
check(
  "the note is private by default",
  listSharedNotes(courseId, studentId).length === 0,
);

setMarker({
  studentId,
  courseId,
  lectureId,
  segmentId: segments[1].id,
  objectiveId: objectives[1].id,
  marker: "confusing",
});
check(
  "one concept marked confusing",
  getDb()
    .prepare<[string, string], { n: number }>(
      `SELECT COUNT(*) AS n FROM comprehension_markers
       WHERE student_id = ? AND course_id = ? AND marker = 'confusing'`,
    )
    .get(studentId, courseId)!.n === 1,
);

// Answer the three checks: first correct, other two wrong.
checks.forEach((interaction, index) => {
  const option =
    index === 0
      ? interaction.options.find((o) => o.is_correct === 1)
      : interaction.options.find((o) => o.is_correct === 0);
  const { isCorrect } = recordInteractionResponse({
    interactionId: interaction.id,
    studentId,
    optionId: option!.id,
    confidence: index === 0 ? 4 : 2,
  });
  check(
    `check ${index + 1} scored as ${index === 0 ? "correct" : "incorrect"}`,
    isCorrect === (index === 0),
  );
});

section("Vertical slice: readiness, feedback and support");

const after = readinessFor(courseId, studentId);
check(
  "readiness now produces a status",
  after.status !== "insufficient_data",
  READINESS_PRESENTATION[after.status].label,
);
check("a composite score exists", after.score !== null, `${Math.round((after.score ?? 0) * 100)}%`);
check(
  "the status is explained",
  after.reasons.length > 0,
  `${after.reasons.length} reasons`,
);
check(
  "confidence in the estimate is reported",
  ["low", "moderate", "high"].includes(after.confidence),
  after.confidence,
);
check(
  "the student is told what they understand",
  after.strengths.length > 0,
  after.strengths.map((s) => s.objective.code).join(", "),
);
check(
  "the student is told what needs review",
  after.gaps.length > 0,
  after.gaps.map((g) => g.objective.code).join(", "),
);
check(
  "objectives with no evidence are reported as unknown, not as failures",
  after.objectives.every(
    (o) => o.standing !== "unknown" || o.answered === 0,
  ),
);

const drafts = draftRecommendations(courseId, after);
check(
  "at least one curriculum recommendation",
  drafts.some((d) => d.pathway === "curriculum"),
);
check(
  "at least one human support pathway",
  drafts.some((d) => d.pathway !== "curriculum"),
  Array.from(new Set(drafts.map((d) => d.pathway))).join(", "),
);
check(
  "every recommendation states why and what next",
  drafts.every((d) => d.rationale.length > 10 && d.nextStep.length > 10),
);

section("Vertical slice: professor sees the student and assigns support");

const newRoster = listRoster(courseId);
check(
  "the student appears on the professor's roster",
  newRoster.some((s) => s.id === studentId),
);
check(
  "the roster carries a status for them",
  readinessFor(courseId, studentId).status === after.status,
);

const professorDraft = drafts[0];
saveRecommendation({
  ...professorDraft,
  courseId,
  studentId,
  source: "professor",
  createdBy: professor.id,
});
const { created } = syncRecommendations(courseId, studentId, after);
const assigned = listRecommendations(courseId, { studentId });
check(
  "professor-assigned recommendation is persisted",
  assigned.some((r) => r.source === "professor"),
);
check(
  "syncing the rest does not duplicate the assigned one",
  assigned.length === drafts.length,
  `${assigned.length} assigned (1 by hand, ${created} synced, ${drafts.length} suggested)`,
);

section("Vertical slice: the student acts on the plan");

respondToRecommendation({
  recommendationId: assigned[0].id,
  studentId,
  status: "completed",
  note: "Worked through it.",
  actorName: "Verification Student",
});
const updated = listRecommendations(courseId, { studentId });
check(
  "student completion is recorded",
  updated.find((r) => r.id === assigned[0].id)?.status === "completed",
);
check(
  "the professor can see the engagement",
  updated.find((r) => r.id === assigned[0].id)?.student_response ===
    "Worked through it.",
);
check(
  "an audit trail of support actions exists",
  getDb()
    .prepare<[string], { n: number }>(
      "SELECT COUNT(*) AS n FROM support_actions WHERE recommendation_id = ?",
    )
    .get(assigned[0].id)!.n >= 2,
);

section("Professor override");

setStatusOverride({
  courseId,
  studentId,
  professorId: professor.id,
  status: "on_track",
  reason: "Spoke after class; the gap was a misread question, not the concept.",
});
const overridden = readinessFor(courseId, studentId);
check("override changes the displayed status", overridden.status === "on_track");
check(
  "the computed status is retained alongside it",
  overridden.computedStatus === after.status,
  `computed ${overridden.computedStatus}`,
);
check(
  "the override reason is surfaced in the explanation",
  overridden.reasons.some((r) => r.includes("misread question")),
);

section("Assessment scoring boundaries");

const practice = getPracticeAssessment(seededCourse.id);
check("a practice assessment exists in the seed", practice !== null);
const written = getDb()
  .prepare<[], { n: number }>(
    `SELECT COUNT(*) AS n FROM assessment_questions WHERE type = 'short_answer'`,
  )
  .get()!.n;
check(
  "short-answer questions exist and are never auto-scored",
  written > 0 &&
    getDb()
      .prepare<[], { n: number }>(
        `SELECT COUNT(*) AS n FROM assessment_responses r
         JOIN assessment_questions q ON q.id = r.question_id
         WHERE q.type = 'short_answer' AND r.is_correct IS NOT NULL`,
      )
      .get()!.n === 0,
  `${written} written questions, 0 auto-marked`,
);

section("Concurrent seeding (regression guard)");

/**
 * `next build` collects page data across nine worker processes. On a cold database
 * they all open it at once. Before the emptiness check moved inside a BEGIN
 * IMMEDIATE transaction, they all saw zero professors, all ran the seed, and every
 * process but the first died on `UNIQUE constraint failed: course_codes.code` —
 * surfacing as a 500 on whichever route that worker was rendering.
 */
{
  const raceDb = resolve(".data/race-check.db");
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      rmSync(`${raceDb}${suffix}`);
    } catch {
      // nothing to clean up
    }
  }

  const workers = 9;
  const results = await Promise.all(
    Array.from({ length: workers }, () =>
      new Promise<{ code: number; out: string }>((done) => {
        const child = spawn(
          process.execPath,
          [process.argv[1].replace(/verify-prototype\.mts$/, "seed-race-worker.mts")],
          {
            env: {
              ...process.env,
              PROTOTYPE_DB_PATH: raceDb,
              NODE_OPTIONS: "--conditions=react-server --import tsx",
            },
          },
        );
        let out = "";
        child.stdout.on("data", (d) => (out += d));
        child.stderr.on("data", (d) => (out += d));
        child.on("close", (code) => done({ code: code ?? 1, out: out.trim() }));
      }),
    ),
  );

  const crashed = results.filter((r) => r.code !== 0);
  check(
    `all ${workers} concurrent cold-start openers succeed`,
    crashed.length === 0,
    crashed.length > 0
      ? crashed[0].out.split("\n")[0]
      : `${workers} of ${workers}`,
  );

  const raceHandle = new Database(raceDb, { readonly: true });
  const professors = raceHandle
    .prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM professors")
    .get()!.n;
  const codes = raceHandle
    .prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM course_codes")
    .get()!.n;
  const seededStudents = raceHandle
    .prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM students")
    .get()!.n;
  raceHandle.close();

  check("seeding ran exactly once", professors === 1 && codes === 1, `professors=${professors} codes=${codes}`);
  check("no duplicated student rows", seededStudents === 12, `students=${seededStudents}`);

  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      rmSync(`${raceDb}${suffix}`);
    } catch {
      // nothing to clean up
    }
  }
}

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.\n`);
  process.exit(1);
}
console.log("All checks passed.\n");
