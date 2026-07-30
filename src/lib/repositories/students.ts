import "server-only";

import { getDb, nowIso } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import type { EntrySource } from "@/lib/domain/vocabulary";
import type { EntryRow, StudentRow } from "./types";

export function getStudent(id: string): StudentRow | null {
  return (
    getDb()
      .prepare<[string], StudentRow>("SELECT * FROM students WHERE id = ?")
      .get(id) ?? null
  );
}

export type RosterStudent = StudentRow & {
  joined_at: string;
  source: EntrySource;
  last_activity_at: string | null;
  questions_submitted: number;
  notes_count: number;
  shared_notes_count: number;
};

export function listRoster(courseId: string): RosterStudent[] {
  return getDb()
    .prepare<[string], RosterStudent>(
      `SELECT
         s.*,
         e.joined_at,
         e.source,
         (SELECT MAX(created_at) FROM activity_events
            WHERE course_id = e.course_id AND student_id = s.id) AS last_activity_at,
         (SELECT COUNT(*) FROM questions
            WHERE course_id = e.course_id AND student_id = s.id) AS questions_submitted,
         (SELECT COUNT(*) FROM student_notes
            WHERE course_id = e.course_id AND student_id = s.id) AS notes_count,
         (SELECT COUNT(*) FROM student_notes
            WHERE course_id = e.course_id AND student_id = s.id
              AND shared_with_professor = 1) AS shared_notes_count
       FROM course_entries e
       JOIN students s ON s.id = e.student_id
       WHERE e.course_id = ?
       ORDER BY s.name`,
    )
    .all(courseId);
}

export function getEntry(courseId: string, studentId: string): EntryRow | null {
  return (
    getDb()
      .prepare<[string, string], EntryRow>(
        "SELECT * FROM course_entries WHERE course_id = ? AND student_id = ?",
      )
      .get(courseId, studentId) ?? null
  );
}

export type JoinCourseInput = {
  courseId: string;
  name: string;
  email?: string | null;
  studentIdNumber?: string | null;
  source: EntrySource;
  consented: boolean;
};

/**
 * Creates (or re-uses) a prototype student record and enrols them in a course.
 *
 * Matching on name + course is deliberate and only defensible because this is an
 * unauthenticated prototype: it lets a student who clears their cookie return to
 * their own work. It is *not* an identity check, and is called out as a known
 * limitation in docs/privacy-and-student-data-considerations.md.
 */
export function joinCourse(input: JoinCourseInput): {
  studentId: string;
  sessionId: string;
  isReturning: boolean;
} {
  const db = getDb();
  const now = nowIso();
  const name = input.name.trim();

  return db.transaction(() => {
    const existing = db
      .prepare<[string, string], StudentRow>(
        `SELECT s.* FROM students s
         JOIN course_entries e ON e.student_id = s.id
         WHERE e.course_id = ? AND LOWER(s.name) = LOWER(?)
         LIMIT 1`,
      )
      .get(input.courseId, name);

    let studentId: string;
    const isReturning = Boolean(existing);

    if (existing) {
      studentId = existing.id;
      if (input.email || input.studentIdNumber) {
        db.prepare(
          `UPDATE students SET
             email = COALESCE(?, email),
             student_id_number = COALESCE(?, student_id_number)
           WHERE id = ?`,
        ).run(input.email ?? null, input.studentIdNumber ?? null, studentId);
      }
    } else {
      studentId = newId("stu");
      db.prepare(
        `INSERT INTO students (id, name, email, student_id_number, is_demo, created_at)
         VALUES (?,?,?,?,0,?)`,
      ).run(
        studentId,
        name,
        input.email ?? null,
        input.studentIdNumber ?? null,
        now,
      );
      db.prepare(
        `INSERT INTO course_entries
           (id, course_id, student_id, source, consent_at, joined_at)
         VALUES (?,?,?,?,?,?)`,
      ).run(
        newId("ent"),
        input.courseId,
        studentId,
        input.source,
        input.consented ? now : null,
        now,
      );
      db.prepare(
        `INSERT INTO activity_events
           (id, course_id, student_id, actor_role, type, summary, created_at)
         VALUES (?,?,?,'student','joined_course',?,?)`,
      ).run(
        newId("act"),
        input.courseId,
        studentId,
        `${name} joined the course`,
        now,
      );
    }

    const sessionId = newId("ses");
    db.prepare(
      `INSERT INTO student_sessions
         (id, student_id, course_id, created_at, last_seen_at)
       VALUES (?,?,?,?,?)`,
    ).run(sessionId, studentId, input.courseId, now, now);

    return { studentId, sessionId, isReturning };
  })();
}

export function touchSession(sessionId: string) {
  getDb()
    .prepare("UPDATE student_sessions SET last_seen_at = ? WHERE id = ?")
    .run(nowIso(), sessionId);
}

export type SessionContext = {
  sessionId: string;
  studentId: string;
  courseId: string;
  studentName: string;
};

export function resolveSession(sessionId: string): SessionContext | null {
  const row = getDb()
    .prepare<[string], { id: string; student_id: string; course_id: string; name: string }>(
      `SELECT ss.id, ss.student_id, ss.course_id, s.name
       FROM student_sessions ss
       JOIN students s ON s.id = ss.student_id
       WHERE ss.id = ?`,
    )
    .get(sessionId);
  if (!row) return null;
  return {
    sessionId: row.id,
    studentId: row.student_id,
    courseId: row.course_id,
    studentName: row.name,
  };
}

/** Demonstration students, used to seed and to label the roster honestly. */
export function isDemoStudent(studentId: string): boolean {
  const row = getDb()
    .prepare<[string], { is_demo: number }>(
      "SELECT is_demo FROM students WHERE id = ?",
    )
    .get(studentId);
  return row?.is_demo === 1;
}
