import "server-only";

import { getDb, nowIso } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import type {
  ContentType,
  SyllabusItemKind,
  Visibility,
} from "@/lib/domain/vocabulary";
import type { MaterialRow, SyllabusItemRow, SyllabusRow } from "./types";

// Materials ------------------------------------------------------------------

export type MaterialWithContext = MaterialRow & {
  module_title: string | null;
  objective_codes: string | null;
  concept_names: string | null;
};

const MATERIAL_SQL = /* sql */ `
  SELECT m.*,
         mod.title AS module_title,
         (SELECT GROUP_CONCAT(o.code, ', ') FROM material_objectives mo
            JOIN learning_objectives o ON o.id = mo.objective_id
            WHERE mo.material_id = m.id) AS objective_codes,
         (SELECT GROUP_CONCAT(c.name, ', ') FROM material_concepts mc
            JOIN concepts c ON c.id = mc.concept_id
            WHERE mc.material_id = m.id) AS concept_names
  FROM course_materials m
  LEFT JOIN modules mod ON mod.id = m.module_id
`;

export function listMaterials(
  courseId: string,
  opts: { studentVisibleOnly?: boolean; contentType?: ContentType } = {},
): MaterialWithContext[] {
  const clauses = ["m.course_id = ?"];
  const params: string[] = [courseId];

  if (opts.studentVisibleOnly) clauses.push("m.visibility = 'students'");
  if (opts.contentType) {
    clauses.push("m.content_type = ?");
    params.push(opts.contentType);
  }

  return getDb()
    .prepare<string[], MaterialWithContext>(
      `${MATERIAL_SQL} WHERE ${clauses.join(" AND ")}
       ORDER BY COALESCE(mod.position, 999), m.position, m.created_at`,
    )
    .all(...params);
}

export function getMaterial(materialId: string): MaterialWithContext | null {
  return (
    getDb()
      .prepare<[string], MaterialWithContext>(`${MATERIAL_SQL} WHERE m.id = ?`)
      .get(materialId) ?? null
  );
}

export type CreateMaterialInput = {
  courseId: string;
  moduleId?: string | null;
  title: string;
  description?: string | null;
  contentType: ContentType;
  url?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  storageAdapter?: string | null;
  dateLabel?: string | null;
  visibility: Visibility;
  professorNotes?: string | null;
  studentInstructions?: string | null;
  objectiveIds?: string[];
  conceptIds?: string[];
};

export function createMaterial(input: CreateMaterialInput): string {
  const db = getDb();
  const id = newId("mat");
  const now = nowIso();

  db.transaction(() => {
    const { next } = db
      .prepare<[string], { next: number }>(
        "SELECT COALESCE(MAX(position), 0) + 1 AS next FROM course_materials WHERE course_id = ?",
      )
      .get(input.courseId)!;

    db.prepare(
      `INSERT INTO course_materials (
         id, course_id, module_id, title, description, content_type, url, file_name,
         file_size, storage_adapter, date_label, visibility, professor_notes,
         student_instructions, position, is_demo, created_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)`,
    ).run(
      id,
      input.courseId,
      input.moduleId ?? null,
      input.title,
      input.description ?? null,
      input.contentType,
      input.url ?? null,
      input.fileName ?? null,
      input.fileSize ?? null,
      input.storageAdapter ?? null,
      input.dateLabel ?? null,
      input.visibility,
      input.professorNotes ?? null,
      input.studentInstructions ?? null,
      next,
      now,
    );

    for (const objectiveId of input.objectiveIds ?? []) {
      db.prepare(
        "INSERT OR IGNORE INTO material_objectives (material_id, objective_id) VALUES (?,?)",
      ).run(id, objectiveId);
    }
    for (const conceptId of input.conceptIds ?? []) {
      db.prepare(
        "INSERT OR IGNORE INTO material_concepts (material_id, concept_id) VALUES (?,?)",
      ).run(id, conceptId);
    }
  })();

  return id;
}

export function setMaterialVisibility(materialId: string, visibility: Visibility) {
  getDb()
    .prepare("UPDATE course_materials SET visibility = ? WHERE id = ?")
    .run(visibility, materialId);
}

export function deleteMaterial(materialId: string) {
  getDb().prepare("DELETE FROM course_materials WHERE id = ?").run(materialId);
}

// Syllabus -------------------------------------------------------------------

export function getSyllabus(courseId: string): SyllabusRow | null {
  return (
    getDb()
      .prepare<[string], SyllabusRow>(
        "SELECT * FROM syllabi WHERE course_id = ? ORDER BY created_at DESC LIMIT 1",
      )
      .get(courseId) ?? null
  );
}

export function listSyllabusItems(syllabusId: string): SyllabusItemRow[] {
  return getDb()
    .prepare<[string], SyllabusItemRow>(
      "SELECT * FROM syllabus_items WHERE syllabus_id = ? ORDER BY kind, position",
    )
    .all(syllabusId);
}

export function createSyllabus(input: {
  courseId: string;
  sourceType: string;
  rawText?: string | null;
  fileName?: string | null;
}): string {
  const id = newId("syl");
  getDb()
    .prepare(
      `INSERT INTO syllabi
         (id, course_id, source_type, file_name, raw_text, extraction_state, created_at)
       VALUES (?,?,?,?,?,'not_run',?)`,
    )
    .run(
      id,
      input.courseId,
      input.sourceType,
      input.fileName ?? null,
      input.rawText ?? null,
      nowIso(),
    );
  return id;
}

export type SyllabusItemDraft = {
  kind: SyllabusItemKind;
  title: string;
  detail?: string | null;
  weekLabel?: string | null;
  dateLabel?: string | null;
  aiGenerated?: boolean;
  approved?: boolean;
};

/** Replaces the extracted item set for a syllabus and records the provider used. */
export function replaceSyllabusItems(
  syllabusId: string,
  items: SyllabusItemDraft[],
  providerLabel: string,
  note: string,
) {
  const db = getDb();
  const now = nowIso();

  db.transaction(() => {
    db.prepare("DELETE FROM syllabus_items WHERE syllabus_id = ?").run(syllabusId);

    const byKind = new Map<string, number>();
    for (const item of items) {
      const position = (byKind.get(item.kind) ?? 0) + 1;
      byKind.set(item.kind, position);
      db.prepare(
        `INSERT INTO syllabus_items
           (id, syllabus_id, kind, title, detail, week_label, date_label, position,
            ai_generated, approved, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      ).run(
        newId("syi"),
        syllabusId,
        item.kind,
        item.title,
        item.detail ?? null,
        item.weekLabel ?? null,
        item.dateLabel ?? null,
        position,
        item.aiGenerated === false ? 0 : 1,
        item.approved ? 1 : 0,
        now,
      );
    }

    db.prepare(
      `UPDATE syllabi SET extraction_state = 'extracted', provider_label = ?,
        extraction_note = ? WHERE id = ?`,
    ).run(providerLabel, note, syllabusId);
  })();
}

export function setSyllabusItemApproved(itemId: string, approved: boolean) {
  getDb()
    .prepare("UPDATE syllabus_items SET approved = ? WHERE id = ?")
    .run(approved ? 1 : 0, itemId);
}

export function updateSyllabusItem(
  itemId: string,
  patch: { title?: string; detail?: string | null },
) {
  const db = getDb();
  if (patch.title !== undefined) {
    db.prepare("UPDATE syllabus_items SET title = ? WHERE id = ?").run(
      patch.title,
      itemId,
    );
  }
  if (patch.detail !== undefined) {
    db.prepare("UPDATE syllabus_items SET detail = ? WHERE id = ?").run(
      patch.detail,
      itemId,
    );
  }
}

/**
 * Publishes the approved syllabus items into the course structure: objectives
 * become learning objectives, weekly topics become modules, exams become
 * assessments. Nothing unapproved is ever published.
 */
export function publishSyllabus(
  syllabusId: string,
  courseId: string,
): { objectives: number; modules: number; assessments: number; readings: number } {
  const db = getDb();
  const now = nowIso();
  let objectives = 0;
  let modules = 0;
  let assessments = 0;
  let readings = 0;

  db.transaction(() => {
    const items = db
      .prepare<[string], SyllabusItemRow>(
        "SELECT * FROM syllabus_items WHERE syllabus_id = ? AND approved = 1 ORDER BY kind, position",
      )
      .all(syllabusId);

    for (const item of items) {
      if (item.kind === "objective") {
        const exists = db
          .prepare<[string, string], { id: string }>(
            "SELECT id FROM learning_objectives WHERE course_id = ? AND text = ?",
          )
          .get(courseId, item.title);
        if (exists) continue;
        const { next } = db
          .prepare<[string], { next: number }>(
            "SELECT COALESCE(MAX(position), 0) + 1 AS next FROM learning_objectives WHERE course_id = ?",
          )
          .get(courseId)!;
        db.prepare(
          `INSERT INTO learning_objectives
             (id, course_id, code, text, position, created_at)
           VALUES (?,?,?,?,?,?)`,
        ).run(newId("obj"), courseId, `LO${next}`, item.title, next, now);
        objectives += 1;
      }

      if (item.kind === "weekly_topic") {
        const exists = db
          .prepare<[string, string], { id: string }>(
            "SELECT id FROM modules WHERE course_id = ? AND title = ?",
          )
          .get(courseId, item.title);
        if (exists) continue;
        const { next } = db
          .prepare<[string], { next: number }>(
            "SELECT COALESCE(MAX(position), 0) + 1 AS next FROM modules WHERE course_id = ?",
          )
          .get(courseId)!;
        db.prepare(
          `INSERT INTO modules
             (id, course_id, position, title, description, week_label, created_at)
           VALUES (?,?,?,?,?,?,?)`,
        ).run(
          newId("mod"),
          courseId,
          next,
          item.title,
          item.detail,
          item.week_label,
          now,
        );
        modules += 1;
      }

      if (item.kind === "exam") {
        const exists = db
          .prepare<[string, string], { id: string }>(
            "SELECT id FROM assessments WHERE course_id = ? AND title = ?",
          )
          .get(courseId, item.title);
        if (exists) continue;
        db.prepare(
          `INSERT INTO assessments
             (id, course_id, type, title, description, scheduled_at, is_practice,
              published, is_demo, created_at)
           VALUES (?,?,?,?,?,?,0,1,0,?)`,
        ).run(
          newId("asm"),
          courseId,
          /final/i.test(item.title) ? "final_exam" : "midterm",
          item.title,
          item.detail,
          item.date_label,
          now,
        );
        assessments += 1;
      }

      if (item.kind === "reading") {
        const exists = db
          .prepare<[string, string], { id: string }>(
            "SELECT id FROM course_materials WHERE course_id = ? AND title = ?",
          )
          .get(courseId, item.title);
        if (exists) continue;
        const { next } = db
          .prepare<[string], { next: number }>(
            "SELECT COALESCE(MAX(position), 0) + 1 AS next FROM course_materials WHERE course_id = ?",
          )
          .get(courseId)!;
        db.prepare(
          `INSERT INTO course_materials
             (id, course_id, title, description, content_type, date_label,
              visibility, position, is_demo, created_at)
           VALUES (?,?,?,?,'reading_assignment',?,'students',?,0,?)`,
        ).run(
          newId("mat"),
          courseId,
          item.title,
          item.detail,
          item.week_label,
          next,
          now,
        );
        readings += 1;
      }
    }

    db.prepare(
      `UPDATE syllabi SET extraction_state = 'published', reviewed_at = ?,
        published_at = ? WHERE id = ?`,
    ).run(now, now, syllabusId);
  })();

  return { objectives, modules, assessments, readings };
}
