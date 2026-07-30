import "server-only";

import { getDb, nowIso } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import {
  aggregateClass,
  computeReadiness,
  type ClassAggregate,
  type ObjectiveRef,
  type ReadinessInput,
  type ReadinessResult,
} from "@/lib/domain/readiness";
import type {
  Marker,
  QuestionKind,
  ReadinessStatus,
} from "@/lib/domain/vocabulary";
import type { OverrideRow, SnapshotRow } from "./types";

function gatherInput(courseId: string, studentId: string): ReadinessInput {
  const db = getDb();

  const objectives = db
    .prepare<[string], ObjectiveRef & { moduleTitle: string | null }>(
      `SELECT o.id, o.code, o.text, m.title AS moduleTitle
       FROM learning_objectives o
       LEFT JOIN modules m ON m.id = o.module_id
       WHERE o.course_id = ?
       ORDER BY o.position`,
    )
    .all(courseId);

  // In-lecture comprehension checks.
  const checkRows = db
    .prepare<
      [string, string],
      { objective_id: string | null; concept_name: string | null; is_correct: number | null }
    >(
      `SELECT i.objective_id, c.name AS concept_name, r.is_correct
       FROM interaction_responses r
       JOIN interactions i ON i.id = r.interaction_id
       JOIN lectures l ON l.id = i.lecture_id
       LEFT JOIN concepts c ON c.id = i.concept_id
       WHERE r.student_id = ? AND l.course_id = ?
         AND i.type = 'comprehension_question'
         AND r.is_correct IS NOT NULL`,
    )
    .all(studentId, courseId);

  // Assessment and practice questions the prototype scores automatically.
  const assessmentRows = db
    .prepare<
      [string, string],
      { objective_id: string | null; concept_name: string | null; is_correct: number | null }
    >(
      `SELECT q.objective_id, c.name AS concept_name, r.is_correct
       FROM assessment_responses r
       JOIN assessment_questions q ON q.id = r.question_id
       JOIN assessments a ON a.id = q.assessment_id
       LEFT JOIN concepts c ON c.id = q.concept_id
       WHERE r.student_id = ? AND a.course_id = ? AND r.is_correct IS NOT NULL`,
    )
    .all(studentId, courseId);

  // Explicit confidence ratings, plus confidence captured on interactions.
  const confidenceRows = db
    .prepare<
      [string, string, string, string],
      { objective_id: string | null; level: number }
    >(
      `SELECT objective_id, level FROM confidence_responses
       WHERE student_id = ? AND course_id = ?
       UNION ALL
       SELECT i.objective_id, r.confidence AS level
       FROM interaction_responses r
       JOIN interactions i ON i.id = r.interaction_id
       JOIN lectures l ON l.id = i.lecture_id
       WHERE r.student_id = ? AND l.course_id = ? AND r.confidence IS NOT NULL`,
    )
    .all(studentId, courseId, studentId, courseId);

  // Markers. Where the student did not tag an objective directly, infer it from
  // an interaction anchored to the same segment.
  const markerRows = db
    .prepare<
      [string, string],
      { objective_id: string | null; concept_name: string | null; marker: Marker }
    >(
      `SELECT
         COALESCE(
           m.objective_id,
           (SELECT i.objective_id FROM interactions i
              WHERE i.segment_id = m.segment_id AND i.objective_id IS NOT NULL
              LIMIT 1),
           (SELECT lo.objective_id FROM lecture_objectives lo
              WHERE lo.lecture_id = m.lecture_id LIMIT 1)
         ) AS objective_id,
         COALESCE(c.name, seg.heading) AS concept_name,
         m.marker
       FROM comprehension_markers m
       LEFT JOIN concepts c ON c.id = m.concept_id
       LEFT JOIN lecture_segments seg ON seg.id = m.segment_id
       WHERE m.student_id = ? AND m.course_id = ?`,
    )
    .all(studentId, courseId);

  const questionRows = db
    .prepare<[string, string], { kind: QuestionKind; objective_id: string | null }>(
      `SELECT kind, objective_id FROM questions
       WHERE student_id = ? AND course_id = ?`,
    )
    .all(studentId, courseId);

  const lecturesAvailable = db
    .prepare<[string], { n: number }>(
      "SELECT COUNT(*) AS n FROM lectures WHERE course_id = ? AND status != 'draft'",
    )
    .get(courseId)!.n;

  const lecturesEngaged = db
    .prepare<[string, string, string, string, string, string, string, string], { n: number }>(
      `SELECT COUNT(*) AS n FROM (
         SELECT DISTINCT lecture_id FROM student_notes
           WHERE student_id = ? AND course_id = ? AND lecture_id IS NOT NULL
         UNION
         SELECT DISTINCT lecture_id FROM comprehension_markers
           WHERE student_id = ? AND course_id = ? AND lecture_id IS NOT NULL
         UNION
         SELECT DISTINCT lecture_id FROM questions
           WHERE student_id = ? AND course_id = ? AND lecture_id IS NOT NULL
         UNION
         SELECT DISTINCT i.lecture_id FROM interaction_responses r
           JOIN interactions i ON i.id = r.interaction_id
           JOIN lectures l ON l.id = i.lecture_id
           WHERE r.student_id = ? AND l.course_id = ?
       )`,
    )
    .get(
      studentId,
      courseId,
      studentId,
      courseId,
      studentId,
      courseId,
      studentId,
      courseId,
    )!.n;

  const checksPublished = db
    .prepare<[string], { n: number }>(
      `SELECT COUNT(*) AS n FROM interactions i
       JOIN lectures l ON l.id = i.lecture_id
       WHERE l.course_id = ? AND l.status != 'draft'
         AND i.type = 'comprehension_question' AND i.published = 1`,
    )
    .get(courseId)!.n;

  const checksAnswered = db
    .prepare<[string, string], { n: number }>(
      `SELECT COUNT(*) AS n FROM interaction_responses r
       JOIN interactions i ON i.id = r.interaction_id
       JOIN lectures l ON l.id = i.lecture_id
       WHERE r.student_id = ? AND l.course_id = ? AND l.status != 'draft'
         AND i.type = 'comprehension_question' AND i.published = 1`,
    )
    .get(studentId, courseId)!.n;

  const helpRequests = db
    .prepare<[string, string], { n: number }>(
      "SELECT COUNT(*) AS n FROM support_requests WHERE student_id = ? AND course_id = ?",
    )
    .get(studentId, courseId)!.n;

  const lastActivity = db
    .prepare<[string, string], { last: string | null }>(
      `SELECT MAX(created_at) AS last FROM activity_events
       WHERE student_id = ? AND course_id = ?`,
    )
    .get(studentId, courseId)!.last;

  const override = db
    .prepare<[string, string], OverrideRow & { professor_name: string }>(
      `SELECT o.*, p.name AS professor_name FROM status_overrides o
       JOIN professors p ON p.id = o.set_by
       WHERE o.student_id = ? AND o.course_id = ? AND o.cleared_at IS NULL
       ORDER BY o.created_at DESC LIMIT 1`,
    )
    .get(studentId, courseId);

  return {
    courseId,
    studentId,
    objectives,
    scored: [
      ...checkRows.map((r) => ({
        objectiveId: r.objective_id,
        conceptName: r.concept_name,
        isCorrect: r.is_correct === 1,
        source: "comprehension_check" as const,
      })),
      ...assessmentRows.map((r) => ({
        objectiveId: r.objective_id,
        conceptName: r.concept_name,
        isCorrect: r.is_correct === 1,
        source: "assessment" as const,
      })),
    ],
    confidence: confidenceRows.map((r) => ({
      objectiveId: r.objective_id,
      level: r.level,
    })),
    markers: markerRows.map((r) => ({
      objectiveId: r.objective_id,
      conceptName: r.concept_name,
      marker: r.marker,
    })),
    questions: questionRows.map((r) => ({
      kind: r.kind,
      objectiveId: r.objective_id,
    })),
    lecturesAvailable,
    lecturesEngaged,
    checksPublished,
    checksAnswered,
    helpRequests,
    lastActivityAt: lastActivity,
    override: override
      ? {
          status: override.status,
          reason: override.reason,
          setByName: override.professor_name,
          createdAt: override.created_at,
        }
      : null,
  };
}

/**
 * Computes readiness for one student and records a snapshot.
 *
 * Snapshots are written only when the status or score has actually moved, so the
 * trend view reflects real change rather than page views.
 */
export function readinessFor(
  courseId: string,
  studentId: string,
  opts: { snapshot?: boolean } = {},
): ReadinessResult {
  const result = computeReadiness(gatherInput(courseId, studentId));
  if (opts.snapshot !== false) recordSnapshot(courseId, studentId, result);
  return result;
}

function recordSnapshot(
  courseId: string,
  studentId: string,
  result: ReadinessResult,
) {
  const db = getDb();
  const previous = db
    .prepare<[string, string], SnapshotRow>(
      `SELECT * FROM readiness_snapshots
       WHERE course_id = ? AND student_id = ?
       ORDER BY computed_at DESC LIMIT 1`,
    )
    .get(courseId, studentId);

  const scoreChanged =
    !previous ||
    previous.status !== result.status ||
    Math.abs((previous.score ?? -1) - (result.score ?? -1)) > 0.005;

  if (!scoreChanged) return;

  db.prepare(
    `INSERT INTO readiness_snapshots
       (id, student_id, course_id, status, score, confidence_level, evidence_count, computed_at)
     VALUES (?,?,?,?,?,?,?,?)`,
  ).run(
    newId("snap"),
    studentId,
    courseId,
    result.status,
    result.score,
    result.confidence,
    result.evidenceCount,
    nowIso(),
  );
}

export type RosterReadiness = {
  studentId: string;
  result: ReadinessResult;
};

export function readinessForCourse(
  courseId: string,
  studentIds: string[],
): RosterReadiness[] {
  return studentIds.map((studentId) => ({
    studentId,
    result: readinessFor(courseId, studentId),
  }));
}

export function classAggregate(
  courseId: string,
  results: RosterReadiness[],
): ClassAggregate {
  const objectives = getDb()
    .prepare<[string], ObjectiveRef>(
      `SELECT o.id, o.code, o.text, m.title AS moduleTitle
       FROM learning_objectives o
       LEFT JOIN modules m ON m.id = o.module_id
       WHERE o.course_id = ? ORDER BY o.position`,
    )
    .all(courseId);
  return aggregateClass(results, objectives);
}

/** Course-level status counts over time, from recorded snapshots only. */
export type TrendPoint = {
  date: string;
  on_track: number;
  needs_review: number;
  support_recommended: number;
  insufficient_data: number;
};

export function courseTrend(courseId: string, days = 21): TrendPoint[] {
  const rows = getDb()
    .prepare<[string], { student_id: string; status: ReadinessStatus; day: string }>(
      `SELECT student_id, status, DATE(computed_at) AS day
       FROM readiness_snapshots
       WHERE course_id = ?
       ORDER BY computed_at`,
    )
    .all(courseId);

  if (rows.length === 0) return [];

  const days_ = Array.from(new Set(rows.map((r) => r.day))).sort().slice(-days);
  const latestByStudent = new Map<string, ReadinessStatus>();
  const points: TrendPoint[] = [];

  for (const day of days_) {
    for (const row of rows.filter((r) => r.day === day)) {
      latestByStudent.set(row.student_id, row.status);
    }
    const point: TrendPoint = {
      date: day,
      on_track: 0,
      needs_review: 0,
      support_recommended: 0,
      insufficient_data: 0,
    };
    for (const status of latestByStudent.values()) point[status] += 1;
    points.push(point);
  }

  return points;
}

// Overrides ------------------------------------------------------------------

export function setStatusOverride(input: {
  courseId: string;
  studentId: string;
  professorId: string;
  status: ReadinessStatus;
  reason: string;
}) {
  const db = getDb();
  db.transaction(() => {
    db.prepare(
      `UPDATE status_overrides SET cleared_at = ?
       WHERE course_id = ? AND student_id = ? AND cleared_at IS NULL`,
    ).run(nowIso(), input.courseId, input.studentId);

    db.prepare(
      `INSERT INTO status_overrides
         (id, student_id, course_id, status, reason, set_by, created_at)
       VALUES (?,?,?,?,?,?,?)`,
    ).run(
      newId("ovr"),
      input.studentId,
      input.courseId,
      input.status,
      input.reason,
      input.professorId,
      nowIso(),
    );
  })();
}

export function clearStatusOverride(courseId: string, studentId: string) {
  getDb()
    .prepare(
      `UPDATE status_overrides SET cleared_at = ?
       WHERE course_id = ? AND student_id = ? AND cleared_at IS NULL`,
    )
    .run(nowIso(), courseId, studentId);
}

export function listOverrideHistory(
  courseId: string,
  studentId: string,
): (OverrideRow & { professor_name: string })[] {
  return getDb()
    .prepare<[string, string], OverrideRow & { professor_name: string }>(
      `SELECT o.*, p.name AS professor_name FROM status_overrides o
       JOIN professors p ON p.id = o.set_by
       WHERE o.course_id = ? AND o.student_id = ?
       ORDER BY o.created_at DESC`,
    )
    .all(courseId, studentId);
}
