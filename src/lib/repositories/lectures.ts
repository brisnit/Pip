import "server-only";

import { getDb, nowIso } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import {
  INFORMATIONAL_INTERACTION_TYPES,
  SCORED_INTERACTION_TYPES,
  type InteractionType,
} from "@/lib/domain/vocabulary";
import type {
  InteractionOptionRow,
  InteractionResponseRow,
  InteractionRow,
  LectureRow,
  ObjectiveRow,
  ScriptureRow,
  SegmentRow,
  SlideRow,
} from "./types";

export type LectureSummary = LectureRow & {
  module_title: string | null;
  segment_count: number;
  interaction_count: number;
  question_count: number;
};

const LECTURE_SUMMARY_SQL = /* sql */ `
  SELECT
    l.*,
    m.title AS module_title,
    (SELECT COUNT(*) FROM lecture_segments WHERE lecture_id = l.id) AS segment_count,
    (SELECT COUNT(*) FROM interactions WHERE lecture_id = l.id) AS interaction_count,
    (SELECT COUNT(*) FROM questions WHERE lecture_id = l.id) AS question_count
  FROM lectures l
  LEFT JOIN modules m ON m.id = l.module_id
`;

export function listLectures(courseId: string): LectureSummary[] {
  return getDb()
    .prepare<[string], LectureSummary>(
      `${LECTURE_SUMMARY_SQL} WHERE l.course_id = ? ORDER BY l.position, l.created_at`,
    )
    .all(courseId);
}

/** Lectures a student is allowed to see: anything past draft. */
export function listStudentLectures(courseId: string): LectureSummary[] {
  return getDb()
    .prepare<[string], LectureSummary>(
      `${LECTURE_SUMMARY_SQL}
       WHERE l.course_id = ? AND l.status != 'draft'
       ORDER BY l.position, l.created_at`,
    )
    .all(courseId);
}

export function getLecture(lectureId: string): LectureSummary | null {
  return (
    getDb()
      .prepare<[string], LectureSummary>(
        `${LECTURE_SUMMARY_SQL} WHERE l.id = ?`,
      )
      .get(lectureId) ?? null
  );
}

export function listSegments(lectureId: string): SegmentRow[] {
  return getDb()
    .prepare<[string], SegmentRow>(
      "SELECT * FROM lecture_segments WHERE lecture_id = ? ORDER BY position",
    )
    .all(lectureId);
}

export function listSlides(lectureId: string): SlideRow[] {
  return getDb()
    .prepare<[string], SlideRow>(
      "SELECT * FROM slides WHERE lecture_id = ? ORDER BY position",
    )
    .all(lectureId);
}

export function listLectureScripture(lectureId: string): ScriptureRow[] {
  return getDb()
    .prepare<[string], ScriptureRow>(
      "SELECT * FROM scripture_references WHERE lecture_id = ? ORDER BY created_at",
    )
    .all(lectureId);
}

export type LectureConceptRow = {
  concept_id: string;
  name: string;
  definition: string | null;
  perspective: string | null;
  objective_id: string | null;
};

export function listLectureConcepts(lectureId: string): LectureConceptRow[] {
  return getDb()
    .prepare<[string], LectureConceptRow>(
      `SELECT c.id AS concept_id, c.name, c.definition, c.perspective, lc.objective_id
       FROM lecture_concepts lc
       JOIN concepts c ON c.id = lc.concept_id
       WHERE lc.lecture_id = ?
       ORDER BY c.name`,
    )
    .all(lectureId);
}

export function listLectureObjectives(lectureId: string): ObjectiveRow[] {
  return getDb()
    .prepare<[string], ObjectiveRow>(
      `SELECT o.* FROM lecture_objectives lo
       JOIN learning_objectives o ON o.id = lo.objective_id
       WHERE lo.lecture_id = ?
       ORDER BY o.position`,
    )
    .all(lectureId);
}

export type LectureResourceRow = {
  material_id: string;
  title: string;
  description: string | null;
  content_type: string;
  url: string | null;
  file_name: string | null;
  relation: string;
};

export function listLectureResources(lectureId: string): LectureResourceRow[] {
  return getDb()
    .prepare<[string], LectureResourceRow>(
      `SELECT m.id AS material_id, m.title, m.description, m.content_type,
              m.url, m.file_name, lr.relation
       FROM lecture_resources lr
       JOIN course_materials m ON m.id = lr.material_id
       WHERE lr.lecture_id = ? AND m.visibility = 'students'
       ORDER BY m.position`,
    )
    .all(lectureId);
}

// Interactions ---------------------------------------------------------------

export type InteractionWithOptions = InteractionRow & {
  options: InteractionOptionRow[];
  concept_name: string | null;
  objective_text: string | null;
  segment_heading: string | null;
};

export function listInteractions(
  lectureId: string,
  opts: { publishedOnly?: boolean } = {},
): InteractionWithOptions[] {
  const db = getDb();
  const rows = db
    .prepare<[string], InteractionRow & {
      concept_name: string | null;
      objective_text: string | null;
      segment_heading: string | null;
    }>(
      `SELECT i.*, c.name AS concept_name, o.text AS objective_text,
              s.heading AS segment_heading
       FROM interactions i
       LEFT JOIN concepts c ON c.id = i.concept_id
       LEFT JOIN learning_objectives o ON o.id = i.objective_id
       LEFT JOIN lecture_segments s ON s.id = i.segment_id
       WHERE i.lecture_id = ?${opts.publishedOnly ? " AND i.published = 1" : ""}
       ORDER BY COALESCE(i.at_seconds, 999999), i.position`,
    )
    .all(lectureId);

  const optionStmt = db.prepare<[string], InteractionOptionRow>(
    "SELECT * FROM interaction_options WHERE interaction_id = ? ORDER BY position",
  );

  return rows.map((row) => ({ ...row, options: optionStmt.all(row.id) }));
}

export function listInteractionResponses(
  studentId: string,
  lectureId: string,
): InteractionResponseRow[] {
  return getDb()
    .prepare<[string, string], InteractionResponseRow>(
      `SELECT r.* FROM interaction_responses r
       JOIN interactions i ON i.id = r.interaction_id
       WHERE r.student_id = ? AND i.lecture_id = ?`,
    )
    .all(studentId, lectureId);
}

export function isScoredInteraction(type: InteractionType): boolean {
  return SCORED_INTERACTION_TYPES.includes(type);
}

export function isInformationalInteraction(type: InteractionType): boolean {
  return INFORMATIONAL_INTERACTION_TYPES.includes(type);
}

// Writes ---------------------------------------------------------------------

export type CreateLectureInput = {
  courseId: string;
  moduleId?: string | null;
  title: string;
  description?: string | null;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  deliveryMode: LectureRow["delivery_mode"];
  status: LectureRow["status"];
  videoUrl?: string | null;
  liveUrl?: string | null;
  teachingNotes?: string | null;
  studentNotes?: string | null;
  transcriptText?: string | null;
  objectiveIds?: string[];
  segments?: { heading: string; body?: string | null; startSeconds: number }[];
  scripture?: { reference: string; note?: string | null }[];
  concepts?: { name: string; definition?: string | null }[];
  comprehensionQuestions?: {
    prompt: string;
    options: { text: string; isCorrect: boolean }[];
    explanation?: string | null;
    atSeconds?: number | null;
    objectiveId?: string | null;
  }[];
};

/** Detects the video provider from a URL so the player can pick an embed strategy. */
export function detectVideoProvider(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.endsWith("youtube.com") || host === "youtu.be") return "youtube";
    if (host.endsWith("vimeo.com")) return "vimeo";
    return "generic";
  } catch {
    return null;
  }
}

export function createLecture(input: CreateLectureInput): string {
  const db = getDb();
  const now = nowIso();
  const lectureId = newId("lec");

  db.transaction(() => {
    const { next } = db
      .prepare<[string], { next: number }>(
        "SELECT COALESCE(MAX(position), 0) + 1 AS next FROM lectures WHERE course_id = ?",
      )
      .get(input.courseId)!;

    db.prepare(
      `INSERT INTO lectures (
         id, course_id, module_id, title, description, scheduled_at,
         duration_minutes, delivery_mode, status, video_provider, video_url,
         live_url, teaching_notes, student_notes, transcript_text,
         position, is_demo, created_at, updated_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
    ).run(
      lectureId,
      input.courseId,
      input.moduleId ?? null,
      input.title,
      input.description ?? null,
      input.scheduledAt ?? null,
      input.durationMinutes ?? null,
      input.deliveryMode,
      input.status,
      detectVideoProvider(input.videoUrl),
      input.videoUrl ?? null,
      input.liveUrl ?? null,
      input.teachingNotes ?? null,
      input.studentNotes ?? null,
      input.transcriptText ?? null,
      next,
      now,
      now,
    );

    for (const objectiveId of input.objectiveIds ?? []) {
      db.prepare(
        `INSERT OR IGNORE INTO lecture_objectives (lecture_id, objective_id)
         VALUES (?,?)`,
      ).run(lectureId, objectiveId);
    }

    const segmentIds: string[] = [];
    (input.segments ?? []).forEach((segment, index) => {
      const id = newId("seg");
      segmentIds.push(id);
      db.prepare(
        `INSERT INTO lecture_segments
           (id, lecture_id, position, start_seconds, heading, body, created_at)
         VALUES (?,?,?,?,?,?,?)`,
      ).run(
        id,
        lectureId,
        index + 1,
        segment.startSeconds,
        segment.heading,
        segment.body ?? null,
        now,
      );
    });

    for (const ref of input.scripture ?? []) {
      db.prepare(
        `INSERT INTO scripture_references
           (id, course_id, lecture_id, reference, note, created_at)
         VALUES (?,?,?,?,?,?)`,
      ).run(newId("scr"), input.courseId, lectureId, ref.reference, ref.note ?? null, now);
    }

    for (const concept of input.concepts ?? []) {
      const existing = db
        .prepare<[string, string], { id: string }>(
          "SELECT id FROM concepts WHERE course_id = ? AND name = ?",
        )
        .get(input.courseId, concept.name);
      const conceptId = existing?.id ?? newId("cpt");
      if (!existing) {
        db.prepare(
          `INSERT INTO concepts (id, course_id, name, definition, created_at)
           VALUES (?,?,?,?,?)`,
        ).run(conceptId, input.courseId, concept.name, concept.definition ?? null, now);
      }
      db.prepare(
        `INSERT OR IGNORE INTO lecture_concepts (lecture_id, concept_id) VALUES (?,?)`,
      ).run(lectureId, conceptId);
    }

    (input.comprehensionQuestions ?? []).forEach((question, index) => {
      const interactionId = newId("int");
      db.prepare(
        `INSERT INTO interactions (
           id, lecture_id, type, prompt, explanation, at_seconds, segment_id,
           objective_id, position, published, published_at, ai_generated, created_at
         ) VALUES (?,?,'comprehension_question',?,?,?,?,?,?,1,?,0,?)`,
      ).run(
        interactionId,
        lectureId,
        question.prompt,
        question.explanation ?? null,
        question.atSeconds ?? null,
        segmentIds[Math.min(index, Math.max(0, segmentIds.length - 1))] ?? null,
        question.objectiveId ?? null,
        index + 1,
        now,
        now,
      );

      question.options.forEach((option, optionIndex) => {
        db.prepare(
          `INSERT INTO interaction_options (id, interaction_id, position, text, is_correct)
           VALUES (?,?,?,?,?)`,
        ).run(
          newId("opt"),
          interactionId,
          optionIndex + 1,
          option.text,
          option.isCorrect ? 1 : 0,
        );
      });
    });
  })();

  return lectureId;
}

export function setLectureStatus(
  lectureId: string,
  status: LectureRow["status"],
  extra: { currentTopic?: string | null } = {},
) {
  const db = getDb();
  const now = nowIso();
  if (status === "live") {
    db.prepare(
      `UPDATE lectures SET status = 'live', live_started_at = ?, live_ended_at = NULL,
        current_topic = COALESCE(?, current_topic), updated_at = ? WHERE id = ?`,
    ).run(now, extra.currentTopic ?? null, now, lectureId);
    return;
  }
  if (status === "ended") {
    db.prepare(
      `UPDATE lectures SET status = 'ended', live_ended_at = ?, updated_at = ?
       WHERE id = ?`,
    ).run(now, now, lectureId);
    return;
  }
  db.prepare(
    "UPDATE lectures SET status = ?, updated_at = ? WHERE id = ?",
  ).run(status, now, lectureId);
}

export function setCurrentTopic(lectureId: string, topic: string) {
  getDb()
    .prepare(
      "UPDATE lectures SET current_topic = ?, updated_at = ? WHERE id = ?",
    )
    .run(topic, nowIso(), lectureId);
}

export function setInteractionPublished(interactionId: string, published: boolean) {
  getDb()
    .prepare(
      "UPDATE interactions SET published = ?, published_at = ? WHERE id = ?",
    )
    .run(published ? 1 : 0, published ? nowIso() : null, interactionId);
}

export function createInteraction(input: {
  lectureId: string;
  type: InteractionType;
  prompt: string;
  body?: string | null;
  explanation?: string | null;
  atSeconds?: number | null;
  segmentId?: string | null;
  slideId?: string | null;
  conceptId?: string | null;
  objectiveId?: string | null;
  published?: boolean;
  aiGenerated?: boolean;
  options?: { text: string; isCorrect: boolean }[];
}): string {
  const db = getDb();
  const now = nowIso();
  const id = newId("int");

  db.transaction(() => {
    const { next } = db
      .prepare<[string], { next: number }>(
        "SELECT COALESCE(MAX(position), 0) + 1 AS next FROM interactions WHERE lecture_id = ?",
      )
      .get(input.lectureId)!;

    const published = input.published ?? true;
    db.prepare(
      `INSERT INTO interactions (
         id, lecture_id, type, prompt, body, explanation, at_seconds, segment_id,
         slide_id, concept_id, objective_id, position, published, published_at,
         ai_generated, created_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id,
      input.lectureId,
      input.type,
      input.prompt,
      input.body ?? null,
      input.explanation ?? null,
      input.atSeconds ?? null,
      input.segmentId ?? null,
      input.slideId ?? null,
      input.conceptId ?? null,
      input.objectiveId ?? null,
      next,
      published ? 1 : 0,
      published ? now : null,
      input.aiGenerated ? 1 : 0,
      now,
    );

    (input.options ?? []).forEach((option, index) => {
      db.prepare(
        `INSERT INTO interaction_options (id, interaction_id, position, text, is_correct)
         VALUES (?,?,?,?,?)`,
      ).run(newId("opt"), id, index + 1, option.text, option.isCorrect ? 1 : 0);
    });
  })();

  return id;
}

export type RecordInteractionResponse = {
  interactionId: string;
  studentId: string;
  optionId?: string | null;
  textResponse?: string | null;
  confidence?: number | null;
};

export function recordInteractionResponse(
  input: RecordInteractionResponse,
): { isCorrect: boolean | null } {
  const db = getDb();
  let isCorrect: boolean | null = null;

  if (input.optionId) {
    const option = db
      .prepare<[string], InteractionOptionRow>(
        "SELECT * FROM interaction_options WHERE id = ?",
      )
      .get(input.optionId);
    if (option) isCorrect = option.is_correct === 1;
  }

  db.prepare(
    `INSERT INTO interaction_responses
       (id, interaction_id, student_id, option_id, text_response, confidence, is_correct, created_at)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT (interaction_id, student_id) DO UPDATE SET
       option_id = excluded.option_id,
       text_response = excluded.text_response,
       confidence = excluded.confidence,
       is_correct = excluded.is_correct,
       created_at = excluded.created_at`,
  ).run(
    newId("ires"),
    input.interactionId,
    input.studentId,
    input.optionId ?? null,
    input.textResponse ?? null,
    input.confidence ?? null,
    isCorrect === null ? null : isCorrect ? 1 : 0,
    nowIso(),
  );

  return { isCorrect };
}

/**
 * Rough presence figure for the live console: distinct students with any recorded
 * activity on this lecture within the window.
 *
 * This is not a presence channel — there is no such thing in this prototype — and
 * the console labels it as "active in the last N minutes" rather than "online".
 */
export function countRecentlyActiveStudents(
  lectureId: string,
  windowMinutes = 30,
): number {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  return (
    getDb()
      .prepare<[string, string], { n: number }>(
        `SELECT COUNT(DISTINCT student_id) AS n FROM activity_events
         WHERE lecture_id = ? AND created_at > ? AND student_id IS NOT NULL`,
      )
      .get(lectureId, since)?.n ?? 0
  );
}

/** Distinct students who have ever worked inside a lecture. */
export function countEngagedStudents(lectureId: string): number {
  return (
    getDb()
      .prepare<[string, string, string, string], { n: number }>(
        `SELECT COUNT(*) AS n FROM (
           SELECT DISTINCT student_id FROM comprehension_markers WHERE lecture_id = ?
           UNION SELECT DISTINCT student_id FROM student_notes WHERE lecture_id = ?
           UNION SELECT DISTINCT student_id FROM questions WHERE lecture_id = ?
           UNION SELECT DISTINCT r.student_id FROM interaction_responses r
             JOIN interactions i ON i.id = r.interaction_id
             WHERE i.lecture_id = ?
         )`,
      )
      .get(lectureId, lectureId, lectureId, lectureId)?.n ?? 0
  );
}

/** Aggregated poll / comprehension results for the live console. */
export type InteractionTally = {
  interactionId: string;
  prompt: string;
  type: InteractionType;
  responses: number;
  correct: number | null;
  options: { id: string; text: string; isCorrect: boolean; count: number }[];
};

export function tallyInteractions(lectureId: string): InteractionTally[] {
  const db = getDb();
  const interactions = listInteractions(lectureId);

  return interactions.map((interaction) => {
    const responses = db
      .prepare<[string], InteractionResponseRow>(
        "SELECT * FROM interaction_responses WHERE interaction_id = ?",
      )
      .all(interaction.id);

    const scored = isScoredInteraction(interaction.type);

    return {
      interactionId: interaction.id,
      prompt: interaction.prompt,
      type: interaction.type,
      responses: responses.length,
      correct: scored
        ? responses.filter((r) => r.is_correct === 1).length
        : null,
      options: interaction.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: option.is_correct === 1,
        count: responses.filter((r) => r.option_id === option.id).length,
      })),
    };
  });
}
