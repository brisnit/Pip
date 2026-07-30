import "server-only";

import { getDb, nowIso, recoverIfEmpty } from "@/lib/db/client";
import { newCourseCode, newId, normalizeCourseCode } from "@/lib/db/ids";
import type {
  ConceptRow,
  CourseCodeRow,
  CourseRow,
  ModuleRow,
  ObjectiveRow,
  ProfessorRow,
} from "./types";

// Professors -----------------------------------------------------------------

export function getProfessor(id: string): ProfessorRow | null {
  return (
    getDb()
      .prepare<[string], ProfessorRow>("SELECT * FROM professors WHERE id = ?")
      .get(id) ?? null
  );
}

/**
 * The prototype has no authentication, so the professor portal operates as the
 * single seeded professor. Replacing this one function with a session lookup is
 * the whole change when auth arrives — see docs/future-authentication-plan.md.
 */
export function getActiveProfessor(): ProfessorRow {
  const query = () =>
    getDb()
      .prepare<[], ProfessorRow>(
        "SELECT * FROM professors ORDER BY is_demo DESC, created_at ASC LIMIT 1",
      )
      .get();

  const row = query();
  if (row) return row;

  // The database was emptied or replaced underneath a running process. Rebuild the
  // demonstration data and try once more rather than 500ing until a restart.
  console.warn(
    "[flc] no professor record found — attempting to re-seed the prototype database",
  );
  if (recoverIfEmpty()) {
    const recovered = query();
    if (recovered) return recovered;
  }

  throw new Error(
    "The prototype database has a schema but no seeded data, and re-seeding it " +
      "failed. Stop the server and run `npm run db:reset` to rebuild it.",
  );
}

// Courses --------------------------------------------------------------------

export type CourseSummary = CourseRow & {
  access_code: string | null;
  student_count: number;
  lecture_count: number;
  module_count: number;
  professor_name: string;
};

const COURSE_SUMMARY_SQL = /* sql */ `
  SELECT
    c.*,
    p.name AS professor_name,
    (SELECT code FROM course_codes WHERE course_id = c.id AND active = 1
       ORDER BY created_at DESC LIMIT 1) AS access_code,
    (SELECT COUNT(*) FROM course_entries WHERE course_id = c.id) AS student_count,
    (SELECT COUNT(*) FROM lectures WHERE course_id = c.id) AS lecture_count,
    (SELECT COUNT(*) FROM modules WHERE course_id = c.id) AS module_count
  FROM courses c
  JOIN professors p ON p.id = c.professor_id
`;

export function listCourses(professorId: string): CourseSummary[] {
  return getDb()
    .prepare<[string], CourseSummary>(
      `${COURSE_SUMMARY_SQL} WHERE c.professor_id = ? ORDER BY c.created_at DESC`,
    )
    .all(professorId);
}

export function getCourse(courseId: string): CourseSummary | null {
  return (
    getDb()
      .prepare<[string], CourseSummary>(`${COURSE_SUMMARY_SQL} WHERE c.id = ?`)
      .get(courseId) ?? null
  );
}

export function findCourseByAccessCode(code: string): CourseSummary | null {
  const normalized = normalizeCourseCode(code);
  if (!normalized) return null;
  return (
    getDb()
      .prepare<[string], CourseSummary>(
        `${COURSE_SUMMARY_SQL}
         WHERE c.id = (SELECT course_id FROM course_codes
                       WHERE code = ? AND active = 1 LIMIT 1)`,
      )
      .get(normalized) ?? null
  );
}

/**
 * Seeded demonstration courses with an active access code.
 *
 * Used on the join screen so a code is always discoverable. Without this, someone
 * opening the prototype for the first time has no way to reach the student
 * experience — the code only exists on a professor screen they may not have visited.
 * Restricted to `is_demo = 1` so a real course's code is never advertised.
 */
export function listDemoCourses(): CourseSummary[] {
  return getDb()
    .prepare<[], CourseSummary>(
      `${COURSE_SUMMARY_SQL}
       WHERE c.is_demo = 1
         AND EXISTS (SELECT 1 FROM course_codes
                     WHERE course_id = c.id AND active = 1)
       ORDER BY c.created_at`,
    )
    .all();
}

export type CreateCourseInput = {
  professorId: string;
  title: string;
  code: string;
  description?: string | null;
  term?: string | null;
  meetingDays?: string | null;
  meetingTime?: string | null;
  location?: string | null;
  format: CourseRow["format"];
  imageTheme: CourseRow["image_theme"];
  estimatedEnrollment?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  objectives?: string[];
  modules?: string[];
};

export type CreateCourseResult = {
  courseId: string;
  accessCode: string;
};

export function createCourse(input: CreateCourseInput): CreateCourseResult {
  const db = getDb();
  const now = nowIso();
  const courseId = newId("crs");

  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO courses (
         id, professor_id, title, code, description, term, meeting_days,
         meeting_time, location, format, image_theme, estimated_enrollment,
         start_date, end_date, is_demo, created_at, updated_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
    ).run(
      courseId,
      input.professorId,
      input.title,
      input.code,
      input.description ?? null,
      input.term ?? null,
      input.meetingDays ?? null,
      input.meetingTime ?? null,
      input.location ?? null,
      input.format,
      input.imageTheme,
      input.estimatedEnrollment ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
      now,
      now,
    );

    const accessCode = issueCourseCode(courseId);

    (input.modules ?? []).forEach((title, index) => {
      if (!title.trim()) return;
      db.prepare(
        `INSERT INTO modules (id, course_id, position, title, created_at)
         VALUES (?,?,?,?,?)`,
      ).run(newId("mod"), courseId, index + 1, title.trim(), now);
    });

    (input.objectives ?? []).forEach((text, index) => {
      if (!text.trim()) return;
      db.prepare(
        `INSERT INTO learning_objectives
           (id, course_id, module_id, code, text, position, created_at)
         VALUES (?,?,NULL,?,?,?,?)`,
      ).run(
        newId("obj"),
        courseId,
        `LO${index + 1}`,
        text.trim(),
        index + 1,
        now,
      );
    });

    return accessCode;
  });

  return { courseId, accessCode: run() };
}

/** Issues a fresh access code, retiring any previous active code. */
export function issueCourseCode(courseId: string): string {
  const db = getDb();
  db.prepare("UPDATE course_codes SET active = 0 WHERE course_id = ?").run(
    courseId,
  );

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = newCourseCode();
    const clash = db
      .prepare<[string], { id: string }>(
        "SELECT id FROM course_codes WHERE code = ?",
      )
      .get(code);
    if (clash) continue;
    db.prepare(
      `INSERT INTO course_codes (id, course_id, code, active, created_at)
       VALUES (?,?,?,1,?)`,
    ).run(newId("cc"), courseId, code, nowIso());
    return code;
  }
  throw new Error("Could not allocate a unique course code after 12 attempts.");
}

export function listCourseCodes(courseId: string): CourseCodeRow[] {
  return getDb()
    .prepare<[string], CourseCodeRow>(
      "SELECT * FROM course_codes WHERE course_id = ? ORDER BY created_at DESC",
    )
    .all(courseId);
}

// Modules, objectives, concepts ----------------------------------------------

export function listModules(courseId: string): ModuleRow[] {
  return getDb()
    .prepare<[string], ModuleRow>(
      "SELECT * FROM modules WHERE course_id = ? ORDER BY position",
    )
    .all(courseId);
}

export function createModule(
  courseId: string,
  title: string,
  description?: string | null,
  weekLabel?: string | null,
): string {
  const db = getDb();
  const { next } = db
    .prepare<[string], { next: number }>(
      "SELECT COALESCE(MAX(position), 0) + 1 AS next FROM modules WHERE course_id = ?",
    )
    .get(courseId)!;
  const id = newId("mod");
  db.prepare(
    `INSERT INTO modules (id, course_id, position, title, description, week_label, created_at)
     VALUES (?,?,?,?,?,?,?)`,
  ).run(id, courseId, next, title, description ?? null, weekLabel ?? null, nowIso());
  return id;
}

export function listObjectives(courseId: string): ObjectiveRow[] {
  return getDb()
    .prepare<[string], ObjectiveRow>(
      "SELECT * FROM learning_objectives WHERE course_id = ? ORDER BY position, code",
    )
    .all(courseId);
}

export function createObjective(
  courseId: string,
  text: string,
  moduleId?: string | null,
): string {
  const db = getDb();
  const { next } = db
    .prepare<[string], { next: number }>(
      "SELECT COALESCE(MAX(position), 0) + 1 AS next FROM learning_objectives WHERE course_id = ?",
    )
    .get(courseId)!;
  const id = newId("obj");
  db.prepare(
    `INSERT INTO learning_objectives
       (id, course_id, module_id, code, text, position, created_at)
     VALUES (?,?,?,?,?,?,?)`,
  ).run(id, courseId, moduleId ?? null, `LO${next}`, text, next, nowIso());
  return id;
}

export function listConcepts(courseId: string): ConceptRow[] {
  return getDb()
    .prepare<[string], ConceptRow>(
      "SELECT * FROM concepts WHERE course_id = ? ORDER BY name",
    )
    .all(courseId);
}

export function upsertConcept(
  courseId: string,
  name: string,
  definition?: string | null,
  perspective?: string | null,
): string {
  const db = getDb();
  const existing = db
    .prepare<[string, string], { id: string }>(
      "SELECT id FROM concepts WHERE course_id = ? AND name = ?",
    )
    .get(courseId, name);
  if (existing) return existing.id;

  const id = newId("cpt");
  db.prepare(
    `INSERT INTO concepts (id, course_id, name, definition, perspective, created_at)
     VALUES (?,?,?,?,?,?)`,
  ).run(id, courseId, name, definition ?? null, perspective ?? null, nowIso());
  return id;
}
