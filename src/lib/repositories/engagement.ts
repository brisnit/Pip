import "server-only";

import { getDb, nowIso } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import type {
  Marker,
  NoteKind,
  QuestionKind,
  QuestionStatus,
} from "@/lib/domain/vocabulary";
import type {
  ActivityRow,
  BookmarkRow,
  ConfidenceRow,
  MarkerRow,
  NoteRow,
  QuestionRow,
} from "./types";

// Activity -------------------------------------------------------------------

export function recordActivity(input: {
  courseId: string;
  studentId?: string | null;
  lectureId?: string | null;
  actorRole?: "student" | "professor" | "system";
  type: string;
  summary: string;
}) {
  getDb()
    .prepare(
      `INSERT INTO activity_events
         (id, course_id, student_id, lecture_id, actor_role, type, summary, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
    )
    .run(
      newId("act"),
      input.courseId,
      input.studentId ?? null,
      input.lectureId ?? null,
      input.actorRole ?? "student",
      input.type,
      input.summary,
      nowIso(),
    );
}

export type ActivityWithStudent = ActivityRow & { student_name: string | null };

export function listRecentActivity(
  courseId: string,
  limit = 12,
): ActivityWithStudent[] {
  return getDb()
    .prepare<[string, number], ActivityWithStudent>(
      `SELECT a.*, s.name AS student_name
       FROM activity_events a
       LEFT JOIN students s ON s.id = a.student_id
       WHERE a.course_id = ?
       ORDER BY a.created_at DESC
       LIMIT ?`,
    )
    .all(courseId, limit);
}

export function listStudentActivity(
  courseId: string,
  studentId: string,
  limit = 20,
): ActivityRow[] {
  return getDb()
    .prepare<[string, string, number], ActivityRow>(
      `SELECT * FROM activity_events
       WHERE course_id = ? AND student_id = ?
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(courseId, studentId, limit);
}

// Notes ----------------------------------------------------------------------

export type NoteWithContext = NoteRow & {
  lecture_title: string | null;
  module_title: string | null;
  segment_heading: string | null;
  concept_name: string | null;
  objective_text: string | null;
};

const NOTE_CONTEXT_SQL = /* sql */ `
  SELECT n.*,
         l.title AS lecture_title,
         m.title AS module_title,
         seg.heading AS segment_heading,
         c.name AS concept_name,
         o.text AS objective_text
  FROM student_notes n
  LEFT JOIN lectures l ON l.id = n.lecture_id
  LEFT JOIN modules m ON m.id = COALESCE(n.module_id, l.module_id)
  LEFT JOIN lecture_segments seg ON seg.id = n.segment_id
  LEFT JOIN concepts c ON c.id = n.concept_id
  LEFT JOIN learning_objectives o ON o.id = n.objective_id
`;

export function listNotes(
  studentId: string,
  courseId: string,
  filters: { lectureId?: string; kind?: NoteKind; moduleId?: string } = {},
): NoteWithContext[] {
  const clauses = ["n.student_id = ?", "n.course_id = ?"];
  const params: (string | number)[] = [studentId, courseId];

  if (filters.lectureId) {
    clauses.push("n.lecture_id = ?");
    params.push(filters.lectureId);
  }
  if (filters.kind) {
    clauses.push("n.kind = ?");
    params.push(filters.kind);
  }
  if (filters.moduleId) {
    clauses.push("COALESCE(n.module_id, l.module_id) = ?");
    params.push(filters.moduleId);
  }

  return getDb()
    .prepare<(string | number)[], NoteWithContext>(
      `${NOTE_CONTEXT_SQL} WHERE ${clauses.join(" AND ")}
       ORDER BY n.created_at DESC`,
    )
    .all(...params);
}

/**
 * Notes a professor is permitted to read: only those the student explicitly
 * shared. Every professor-facing query for notes must go through this function.
 */
export function listSharedNotes(
  courseId: string,
  studentId?: string,
): NoteWithContext[] {
  const clauses = ["n.course_id = ?", "n.shared_with_professor = 1"];
  const params: string[] = [courseId];
  if (studentId) {
    clauses.push("n.student_id = ?");
    params.push(studentId);
  }
  return getDb()
    .prepare<string[], NoteWithContext>(
      `${NOTE_CONTEXT_SQL} WHERE ${clauses.join(" AND ")} ORDER BY n.created_at DESC`,
    )
    .all(...params);
}

export type CreateNoteInput = {
  studentId: string;
  courseId: string;
  lectureId?: string | null;
  moduleId?: string | null;
  segmentId?: string | null;
  conceptId?: string | null;
  objectiveId?: string | null;
  kind: NoteKind;
  title?: string | null;
  body: string;
  atSeconds?: number | null;
  transcriptExcerpt?: string | null;
  scriptureReference?: string | null;
  shared?: boolean;
};

export function createNote(input: CreateNoteInput): string {
  const id = newId("note");
  const now = nowIso();
  getDb()
    .prepare(
      `INSERT INTO student_notes (
         id, student_id, course_id, lecture_id, module_id, segment_id, concept_id,
         objective_id, kind, title, body, at_seconds, transcript_excerpt,
         scripture_reference, shared_with_professor, is_demo, created_at, updated_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
    )
    .run(
      id,
      input.studentId,
      input.courseId,
      input.lectureId ?? null,
      input.moduleId ?? null,
      input.segmentId ?? null,
      input.conceptId ?? null,
      input.objectiveId ?? null,
      input.kind,
      input.title ?? null,
      input.body,
      input.atSeconds ?? null,
      input.transcriptExcerpt ?? null,
      input.scriptureReference ?? null,
      input.shared ? 1 : 0,
      now,
      now,
    );
  return id;
}

export function setNoteShared(noteId: string, studentId: string, shared: boolean) {
  getDb()
    .prepare(
      `UPDATE student_notes SET shared_with_professor = ?, updated_at = ?
       WHERE id = ? AND student_id = ?`,
    )
    .run(shared ? 1 : 0, nowIso(), noteId, studentId);
}

export function deleteNote(noteId: string, studentId: string) {
  getDb()
    .prepare("DELETE FROM student_notes WHERE id = ? AND student_id = ?")
    .run(noteId, studentId);
}

// Bookmarks ------------------------------------------------------------------

export function createBookmark(input: {
  studentId: string;
  courseId: string;
  lectureId: string;
  segmentId?: string | null;
  atSeconds: number;
  label?: string | null;
  transcriptExcerpt?: string | null;
}): string {
  const id = newId("bmk");
  getDb()
    .prepare(
      `INSERT INTO bookmarks
         (id, student_id, course_id, lecture_id, segment_id, at_seconds, label,
          transcript_excerpt, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      id,
      input.studentId,
      input.courseId,
      input.lectureId,
      input.segmentId ?? null,
      input.atSeconds,
      input.label ?? null,
      input.transcriptExcerpt ?? null,
      nowIso(),
    );
  return id;
}

export function listBookmarks(
  studentId: string,
  courseId: string,
  lectureId?: string,
): BookmarkRow[] {
  const clauses = ["student_id = ?", "course_id = ?"];
  const params: string[] = [studentId, courseId];
  if (lectureId) {
    clauses.push("lecture_id = ?");
    params.push(lectureId);
  }
  return getDb()
    .prepare<string[], BookmarkRow>(
      `SELECT * FROM bookmarks WHERE ${clauses.join(" AND ")} ORDER BY at_seconds`,
    )
    .all(...params);
}

export function deleteBookmark(bookmarkId: string, studentId: string) {
  getDb()
    .prepare("DELETE FROM bookmarks WHERE id = ? AND student_id = ?")
    .run(bookmarkId, studentId);
}

// Comprehension markers ------------------------------------------------------

export function setMarker(input: {
  studentId: string;
  courseId: string;
  lectureId?: string | null;
  segmentId?: string | null;
  conceptId?: string | null;
  objectiveId?: string | null;
  marker: Marker;
  atSeconds?: number | null;
  transcriptExcerpt?: string | null;
  note?: string | null;
}): { created: boolean } {
  const db = getDb();

  // Markers toggle: re-marking the same segment the same way clears it, and the
  // clear/confusing pair is mutually exclusive.
  const existing = db
    .prepare<[string, string | null, string], MarkerRow>(
      `SELECT * FROM comprehension_markers
       WHERE student_id = ? AND segment_id IS ? AND marker = ?`,
    )
    .get(input.studentId, input.segmentId ?? null, input.marker);

  if (existing) {
    db.prepare("DELETE FROM comprehension_markers WHERE id = ?").run(existing.id);
    return { created: false };
  }

  if (input.marker === "clear" || input.marker === "confusing") {
    const opposite = input.marker === "clear" ? "confusing" : "clear";
    db.prepare(
      `DELETE FROM comprehension_markers
       WHERE student_id = ? AND segment_id IS ? AND marker = ?`,
    ).run(input.studentId, input.segmentId ?? null, opposite);
  }

  db.prepare(
    `INSERT INTO comprehension_markers (
       id, student_id, course_id, lecture_id, segment_id, concept_id, objective_id,
       marker, at_seconds, transcript_excerpt, note, created_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    newId("mrk"),
    input.studentId,
    input.courseId,
    input.lectureId ?? null,
    input.segmentId ?? null,
    input.conceptId ?? null,
    input.objectiveId ?? null,
    input.marker,
    input.atSeconds ?? null,
    input.transcriptExcerpt ?? null,
    input.note ?? null,
    nowIso(),
  );

  return { created: true };
}

export function listMarkers(
  studentId: string,
  courseId: string,
  lectureId?: string,
): MarkerRow[] {
  const clauses = ["student_id = ?", "course_id = ?"];
  const params: string[] = [studentId, courseId];
  if (lectureId) {
    clauses.push("lecture_id = ?");
    params.push(lectureId);
  }
  return getDb()
    .prepare<string[], MarkerRow>(
      `SELECT * FROM comprehension_markers WHERE ${clauses.join(" AND ")}
       ORDER BY created_at DESC`,
    )
    .all(...params);
}

/** Class-level confusion, aggregated by segment. Never shows who marked what. */
export type SegmentConfusion = {
  segment_id: string;
  heading: string;
  lecture_id: string;
  lecture_title: string;
  confusing: number;
  clear: number;
  distinct_students: number;
};

export function listSegmentConfusion(
  courseId: string,
  lectureId?: string,
): SegmentConfusion[] {
  const clauses = ["m.course_id = ?", "m.segment_id IS NOT NULL"];
  const params: string[] = [courseId];
  if (lectureId) {
    clauses.push("m.lecture_id = ?");
    params.push(lectureId);
  }
  return getDb()
    .prepare<string[], SegmentConfusion>(
      `SELECT
         seg.id AS segment_id,
         seg.heading,
         l.id AS lecture_id,
         l.title AS lecture_title,
         SUM(CASE WHEN m.marker = 'confusing' THEN 1 ELSE 0 END) AS confusing,
         SUM(CASE WHEN m.marker = 'clear' THEN 1 ELSE 0 END) AS clear,
         COUNT(DISTINCT m.student_id) AS distinct_students
       FROM comprehension_markers m
       JOIN lecture_segments seg ON seg.id = m.segment_id
       JOIN lectures l ON l.id = seg.lecture_id
       WHERE ${clauses.join(" AND ")}
       GROUP BY seg.id
       HAVING confusing > 0
       ORDER BY confusing DESC, seg.position`,
    )
    .all(...params);
}

// Confidence -----------------------------------------------------------------

export function recordConfidence(input: {
  studentId: string;
  courseId: string;
  lectureId?: string | null;
  objectiveId?: string | null;
  conceptId?: string | null;
  level: number;
  context?: string | null;
}): string {
  const id = newId("cnf");
  getDb()
    .prepare(
      `INSERT INTO confidence_responses
         (id, student_id, course_id, lecture_id, objective_id, concept_id, level, context, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      id,
      input.studentId,
      input.courseId,
      input.lectureId ?? null,
      input.objectiveId ?? null,
      input.conceptId ?? null,
      Math.max(1, Math.min(5, Math.round(input.level))),
      input.context ?? null,
      nowIso(),
    );
  return id;
}

export function listConfidence(
  studentId: string,
  courseId: string,
): ConfidenceRow[] {
  return getDb()
    .prepare<[string, string], ConfidenceRow>(
      `SELECT * FROM confidence_responses WHERE student_id = ? AND course_id = ?
       ORDER BY created_at DESC`,
    )
    .all(studentId, courseId);
}

// Questions ------------------------------------------------------------------

export type QuestionWithContext = QuestionRow & {
  student_name: string;
  lecture_title: string | null;
  segment_heading: string | null;
  concept_name: string | null;
  votes: number;
  answer_body: string | null;
  answered_at: string | null;
};

const QUESTION_SQL = /* sql */ `
  SELECT q.*,
         s.name AS student_name,
         l.title AS lecture_title,
         seg.heading AS segment_heading,
         c.name AS concept_name,
         (SELECT COUNT(*) FROM question_votes WHERE question_id = q.id) AS votes,
         (SELECT body FROM professor_answers WHERE question_id = q.id
            ORDER BY created_at DESC LIMIT 1) AS answer_body,
         (SELECT created_at FROM professor_answers WHERE question_id = q.id
            ORDER BY created_at DESC LIMIT 1) AS answered_at
  FROM questions q
  JOIN students s ON s.id = q.student_id
  LEFT JOIN lectures l ON l.id = q.lecture_id
  LEFT JOIN lecture_segments seg ON seg.id = q.segment_id
  LEFT JOIN concepts c ON c.id = q.concept_id
`;

export function listQuestions(
  courseId: string,
  filters: {
    lectureId?: string;
    status?: QuestionStatus;
    studentId?: string;
    limit?: number;
  } = {},
): QuestionWithContext[] {
  const clauses = ["q.course_id = ?"];
  const params: (string | number)[] = [courseId];

  if (filters.lectureId) {
    clauses.push("q.lecture_id = ?");
    params.push(filters.lectureId);
  }
  if (filters.status) {
    clauses.push("q.status = ?");
    params.push(filters.status);
  }
  if (filters.studentId) {
    clauses.push("q.student_id = ?");
    params.push(filters.studentId);
  }

  const limit = filters.limit ?? 200;
  params.push(limit);

  return getDb()
    .prepare<(string | number)[], QuestionWithContext>(
      `${QUESTION_SQL} WHERE ${clauses.join(" AND ")}
       ORDER BY votes DESC, q.created_at DESC LIMIT ?`,
    )
    .all(...params);
}

export function createQuestion(input: {
  studentId: string;
  courseId: string;
  lectureId?: string | null;
  segmentId?: string | null;
  conceptId?: string | null;
  objectiveId?: string | null;
  kind: QuestionKind;
  body: string;
  atSeconds?: number | null;
  transcriptExcerpt?: string | null;
  anonymous?: boolean;
}): string {
  const id = newId("qst");
  getDb()
    .prepare(
      `INSERT INTO questions (
         id, student_id, course_id, lecture_id, segment_id, concept_id, objective_id,
         kind, body, at_seconds, transcript_excerpt, status, anonymous, is_demo, created_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,'open',?,0,?)`,
    )
    .run(
      id,
      input.studentId,
      input.courseId,
      input.lectureId ?? null,
      input.segmentId ?? null,
      input.conceptId ?? null,
      input.objectiveId ?? null,
      input.kind,
      input.body,
      input.atSeconds ?? null,
      input.transcriptExcerpt ?? null,
      input.anonymous ? 1 : 0,
      nowIso(),
    );
  return id;
}

export function toggleQuestionVote(questionId: string, studentId: string): boolean {
  const db = getDb();
  const existing = db
    .prepare<[string, string], { question_id: string }>(
      "SELECT question_id FROM question_votes WHERE question_id = ? AND student_id = ?",
    )
    .get(questionId, studentId);

  if (existing) {
    db.prepare(
      "DELETE FROM question_votes WHERE question_id = ? AND student_id = ?",
    ).run(questionId, studentId);
    return false;
  }

  db.prepare(
    "INSERT INTO question_votes (question_id, student_id, created_at) VALUES (?,?,?)",
  ).run(questionId, studentId, nowIso());
  return true;
}

export function listVotedQuestionIds(
  studentId: string,
  courseId: string,
): string[] {
  return getDb()
    .prepare<[string, string], { question_id: string }>(
      `SELECT v.question_id FROM question_votes v
       JOIN questions q ON q.id = v.question_id
       WHERE v.student_id = ? AND q.course_id = ?`,
    )
    .all(studentId, courseId)
    .map((row) => row.question_id);
}

export function answerQuestion(
  questionId: string,
  professorId: string,
  body: string,
) {
  const db = getDb();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO professor_answers (id, question_id, professor_id, body, created_at)
       VALUES (?,?,?,?,?)`,
    ).run(newId("ans"), questionId, professorId, body, nowIso());
    db.prepare("UPDATE questions SET status = 'answered' WHERE id = ?").run(
      questionId,
    );
  })();
}

export function setQuestionStatus(questionId: string, status: QuestionStatus) {
  getDb()
    .prepare("UPDATE questions SET status = ? WHERE id = ?")
    .run(status, questionId);
}
