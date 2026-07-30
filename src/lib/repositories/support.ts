import "server-only";

import { product } from "@/config/product";
import { getDb, nowIso } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import type { ReadinessResult } from "@/lib/domain/readiness";
import {
  recommendSupport,
  type DraftRecommendation,
  type SupportCatalog,
} from "@/lib/domain/support";
import type {
  FollowUpStatus,
  Priority,
  SupportPathway,
  SupportRequestKind,
  SupportStatus,
} from "@/lib/domain/vocabulary";
import { CONTENT_TYPE_LABELS } from "@/lib/domain/vocabulary";
import type {
  ProfessorNoteRow,
  RecommendationRow,
  SupportActionRow,
  SupportRequestRow,
} from "./types";

// Catalogue ------------------------------------------------------------------

/** Assembles the real, published course resources the recommender may point at. */
export function buildCatalog(courseId: string): SupportCatalog {
  const db = getDb();

  const course = db
    .prepare<[string], { title: string; professor_name: string }>(
      `SELECT c.title, p.name AS professor_name FROM courses c
       JOIN professors p ON p.id = c.professor_id WHERE c.id = ?`,
    )
    .get(courseId);

  const segments = db
    .prepare<[string], {
      objectiveId: string | null;
      conceptId: string | null;
      lectureId: string;
      lectureTitle: string;
      segmentId: string;
      heading: string;
      atSeconds: number;
    }>(
      `SELECT
         COALESCE(
           (SELECT i.objective_id FROM interactions i
              WHERE i.segment_id = seg.id AND i.objective_id IS NOT NULL LIMIT 1),
           (SELECT lo.objective_id FROM lecture_objectives lo
              WHERE lo.lecture_id = l.id LIMIT 1)
         ) AS objectiveId,
         (SELECT i.concept_id FROM interactions i
            WHERE i.segment_id = seg.id AND i.concept_id IS NOT NULL LIMIT 1) AS conceptId,
         l.id AS lectureId,
         l.title AS lectureTitle,
         seg.id AS segmentId,
         seg.heading AS heading,
         seg.start_seconds AS atSeconds
       FROM lecture_segments seg
       JOIN lectures l ON l.id = seg.lecture_id
       WHERE l.course_id = ? AND l.status != 'draft'
       ORDER BY l.position, seg.position`,
    )
    .all(courseId);

  const materials = db
    .prepare<[string], {
      objectiveId: string | null;
      conceptId: string | null;
      materialId: string;
      title: string;
      contentType: keyof typeof CONTENT_TYPE_LABELS;
    }>(
      `SELECT
         (SELECT mo.objective_id FROM material_objectives mo
            WHERE mo.material_id = m.id LIMIT 1) AS objectiveId,
         (SELECT mc.concept_id FROM material_concepts mc
            WHERE mc.material_id = m.id LIMIT 1) AS conceptId,
         m.id AS materialId,
         m.title,
         m.content_type AS contentType
       FROM course_materials m
       WHERE m.course_id = ? AND m.visibility = 'students'
       ORDER BY m.position`,
    )
    .all(courseId);

  const practice = db
    .prepare<[string], { id: string; title: string }>(
      `SELECT id, title FROM assessments
       WHERE course_id = ? AND is_practice = 1 AND published = 1
       ORDER BY created_at LIMIT 1`,
    )
    .get(courseId);

  const upcoming = db
    .prepare<[string], { id: string; title: string; scheduledAt: string | null }>(
      `SELECT id, title, scheduled_at AS scheduledAt FROM assessments
       WHERE course_id = ? AND is_practice = 0 AND published = 1
         AND scheduled_at IS NOT NULL
       ORDER BY scheduled_at LIMIT 1`,
    )
    .get(courseId);

  return {
    courseTitle: course?.title ?? "this course",
    segments,
    materials: materials.map((m) => ({
      objectiveId: m.objectiveId,
      conceptId: m.conceptId,
      materialId: m.materialId,
      title: m.title,
      contentTypeLabel: CONTENT_TYPE_LABELS[m.contentType] ?? "resource",
    })),
    practiceAssessment: practice ?? null,
    upcomingAssessment: upcoming ?? null,
    studyGuides: materials
      .filter((m) => m.contentType === "study_guide" || m.contentType === "review_sheet")
      .map((m) => ({ materialId: m.materialId, title: m.title })),
    taName: product.support.taName,
    professorName: course?.professor_name ?? "your professor",
  };
}

/** Draft recommendations for a student, without writing anything. */
export function draftRecommendations(
  courseId: string,
  readiness: ReadinessResult,
): DraftRecommendation[] {
  return recommendSupport(readiness, buildCatalog(courseId));
}

// Recommendations ------------------------------------------------------------

export type RecommendationWithContext = RecommendationRow & {
  objective_text: string | null;
  objective_code: string | null;
  lecture_title: string | null;
  material_title: string | null;
  concept_name: string | null;
  student_name: string;
  action_count: number;
};

const RECOMMENDATION_SQL = /* sql */ `
  SELECT r.*,
         o.text AS objective_text,
         o.code AS objective_code,
         l.title AS lecture_title,
         m.title AS material_title,
         c.name AS concept_name,
         s.name AS student_name,
         (SELECT COUNT(*) FROM support_actions WHERE recommendation_id = r.id) AS action_count
  FROM support_recommendations r
  JOIN students s ON s.id = r.student_id
  LEFT JOIN learning_objectives o ON o.id = r.objective_id
  LEFT JOIN lectures l ON l.id = r.lecture_id
  LEFT JOIN course_materials m ON m.id = r.material_id
  LEFT JOIN concepts c ON c.id = r.concept_id
`;

export function listRecommendations(
  courseId: string,
  opts: { studentId?: string; activeOnly?: boolean } = {},
): RecommendationWithContext[] {
  const clauses = ["r.course_id = ?"];
  const params: string[] = [courseId];
  if (opts.studentId) {
    clauses.push("r.student_id = ?");
    params.push(opts.studentId);
  }
  if (opts.activeOnly) clauses.push("r.status NOT IN ('completed','declined')");

  return getDb()
    .prepare<string[], RecommendationWithContext>(
      `${RECOMMENDATION_SQL} WHERE ${clauses.join(" AND ")}
       ORDER BY
         CASE r.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
         r.position, r.created_at`,
    )
    .all(...params);
}

export function getRecommendation(id: string): RecommendationWithContext | null {
  return (
    getDb()
      .prepare<[string], RecommendationWithContext>(
        `${RECOMMENDATION_SQL} WHERE r.id = ?`,
      )
      .get(id) ?? null
  );
}

export type SaveRecommendationInput = DraftRecommendation & {
  courseId: string;
  studentId: string;
  source: "system" | "professor";
  createdBy?: string | null;
};

export function saveRecommendation(input: SaveRecommendationInput): string {
  const db = getDb();
  const id = newId("rec");
  const now = nowIso();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO support_recommendations (
         id, course_id, student_id, objective_id, concept_id, lecture_id, material_id,
         pathway, title, rationale, next_step, priority, source, created_by, status,
         position, is_demo, created_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'recommended',?,0,?)`,
    ).run(
      id,
      input.courseId,
      input.studentId,
      input.objectiveId,
      input.conceptId,
      input.lectureId,
      input.materialId,
      input.pathway,
      input.title,
      input.rationale,
      input.nextStep,
      input.priority,
      input.source,
      input.createdBy ?? null,
      input.position,
      now,
    );

    db.prepare(
      `INSERT INTO support_actions
         (id, recommendation_id, actor_role, actor_name, action, note, created_at)
       VALUES (?,?,?,?,?,?,?)`,
    ).run(
      newId("sac"),
      id,
      input.source === "professor" ? "professor" : "system",
      null,
      "recommended",
      input.rationale,
      now,
    );
  })();

  return id;
}

/**
 * Ensures the current computed plan is persisted for a student, without creating
 * duplicates. A recommendation is considered "the same" when its pathway and
 * title match an existing active one.
 */
export function syncRecommendations(
  courseId: string,
  studentId: string,
  readiness: ReadinessResult,
): { created: number } {
  const drafts = draftRecommendations(courseId, readiness);
  const existing = listRecommendations(courseId, { studentId });
  const seen = new Set(existing.map((r) => `${r.pathway}::${r.title}`));

  let created = 0;
  for (const draft of drafts) {
    const key = `${draft.pathway}::${draft.title}`;
    if (seen.has(key)) continue;
    saveRecommendation({
      ...draft,
      courseId,
      studentId,
      source: "system",
      position: existing.length + created,
    });
    seen.add(key);
    created += 1;
  }
  return { created };
}

export function respondToRecommendation(input: {
  recommendationId: string;
  studentId: string;
  status: SupportStatus;
  note?: string | null;
  actorName?: string | null;
}) {
  const db = getDb();
  const now = nowIso();

  db.transaction(() => {
    db.prepare(
      `UPDATE support_recommendations SET
         status = ?,
         student_response = COALESCE(?, student_response),
         student_responded_at = ?,
         completed_at = CASE WHEN ? = 'completed' THEN ? ELSE completed_at END
       WHERE id = ? AND student_id = ?`,
    ).run(
      input.status,
      input.note ?? null,
      now,
      input.status,
      now,
      input.recommendationId,
      input.studentId,
    );

    db.prepare(
      `INSERT INTO support_actions
         (id, recommendation_id, actor_role, actor_name, action, note, created_at)
       VALUES (?,?,'student',?,?,?,?)`,
    ).run(
      newId("sac"),
      input.recommendationId,
      input.actorName ?? null,
      input.status,
      input.note ?? null,
      now,
    );
  })();
}

export function professorRespondToRecommendation(input: {
  recommendationId: string;
  professorName: string;
  response: string;
}) {
  const db = getDb();
  const now = nowIso();
  db.transaction(() => {
    db.prepare(
      "UPDATE support_recommendations SET professor_response = ? WHERE id = ?",
    ).run(input.response, input.recommendationId);
    db.prepare(
      `INSERT INTO support_actions
         (id, recommendation_id, actor_role, actor_name, action, note, created_at)
       VALUES (?,?,'professor',?,'commented',?,?)`,
    ).run(
      newId("sac"),
      input.recommendationId,
      input.professorName,
      input.response,
      now,
    );
  })();
}

export function listRecommendationActions(
  recommendationId: string,
): SupportActionRow[] {
  return getDb()
    .prepare<[string], SupportActionRow>(
      `SELECT * FROM support_actions WHERE recommendation_id = ?
       ORDER BY created_at`,
    )
    .all(recommendationId);
}

// Requests -------------------------------------------------------------------

export type SupportRequestWithContext = SupportRequestRow & {
  student_name: string;
  recommendation_title: string | null;
};

export function listSupportRequests(
  courseId: string,
  opts: { studentId?: string } = {},
): SupportRequestWithContext[] {
  const clauses = ["r.course_id = ?"];
  const params: string[] = [courseId];
  if (opts.studentId) {
    clauses.push("r.student_id = ?");
    params.push(opts.studentId);
  }
  return getDb()
    .prepare<string[], SupportRequestWithContext>(
      `SELECT r.*, s.name AS student_name, rec.title AS recommendation_title
       FROM support_requests r
       JOIN students s ON s.id = r.student_id
       LEFT JOIN support_recommendations rec ON rec.id = r.recommendation_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY r.created_at DESC`,
    )
    .all(...params);
}

export function createSupportRequest(input: {
  courseId: string;
  studentId: string;
  recommendationId?: string | null;
  kind: SupportRequestKind;
  topics?: string | null;
  preferredTime?: string | null;
  message?: string | null;
  prepSummary?: string | null;
}): string {
  const db = getDb();
  const id = newId("sreq");
  const now = nowIso();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO support_requests (
         id, recommendation_id, course_id, student_id, kind, topics, preferred_time,
         message, prep_summary, status, created_at
       ) VALUES (?,?,?,?,?,?,?,?,?,'submitted',?)`,
    ).run(
      id,
      input.recommendationId ?? null,
      input.courseId,
      input.studentId,
      input.kind,
      input.topics ?? null,
      input.preferredTime ?? null,
      input.message ?? null,
      input.prepSummary ?? null,
      now,
    );

    if (input.recommendationId) {
      db.prepare(
        `UPDATE support_recommendations SET status = 'in_progress'
         WHERE id = ? AND status IN ('recommended','accepted')`,
      ).run(input.recommendationId);
    }

    db.prepare(
      `INSERT INTO support_actions
         (id, recommendation_id, request_id, actor_role, action, note, created_at)
       VALUES (?,?,?,'student','requested',?,?)`,
    ).run(
      newId("sac"),
      input.recommendationId ?? null,
      id,
      input.topics ?? null,
      now,
    );
  })();

  return id;
}

export function setSupportRequestStatus(
  requestId: string,
  status: SupportRequestRow["status"],
) {
  getDb()
    .prepare("UPDATE support_requests SET status = ? WHERE id = ?")
    .run(status, requestId);
}

// Professor notes ------------------------------------------------------------

export function listProfessorNotes(
  courseId: string,
  studentId?: string,
): (ProfessorNoteRow & { student_name: string; professor_name: string })[] {
  const clauses = ["n.course_id = ?"];
  const params: string[] = [courseId];
  if (studentId) {
    clauses.push("n.student_id = ?");
    params.push(studentId);
  }
  return getDb()
    .prepare<string[], ProfessorNoteRow & { student_name: string; professor_name: string }>(
      `SELECT n.*, s.name AS student_name, p.name AS professor_name
       FROM professor_notes n
       JOIN students s ON s.id = n.student_id
       JOIN professors p ON p.id = n.professor_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY n.created_at DESC`,
    )
    .all(...params);
}

export function createProfessorNote(input: {
  professorId: string;
  courseId: string;
  studentId: string;
  body: string;
}): string {
  const id = newId("pnote");
  getDb()
    .prepare(
      `INSERT INTO professor_notes
         (id, professor_id, course_id, student_id, body, follow_up_status, created_at)
       VALUES (?,?,?,?,?,'open',?)`,
    )
    .run(id, input.professorId, input.courseId, input.studentId, input.body, nowIso());
  return id;
}

export function setFollowUpStatus(noteId: string, status: FollowUpStatus) {
  getDb()
    .prepare(
      "UPDATE professor_notes SET follow_up_status = ?, resolved_at = ? WHERE id = ?",
    )
    .run(status, status === "complete" ? nowIso() : null, noteId);
}

// Aggregate helpers ----------------------------------------------------------

export type SupportSummary = {
  pathway: SupportPathway;
  total: number;
  completed: number;
  declined: number;
  outstanding: number;
};

export function supportSummary(courseId: string): SupportSummary[] {
  return getDb()
    .prepare<[string], SupportSummary>(
      `SELECT
         pathway,
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) AS declined,
         SUM(CASE WHEN status NOT IN ('completed','declined') THEN 1 ELSE 0 END) AS outstanding
       FROM support_recommendations
       WHERE course_id = ?
       GROUP BY pathway`,
    )
    .all(courseId);
}

export function priorityRank(priority: Priority): number {
  return priority === "high" ? 0 : priority === "medium" ? 1 : 2;
}
