import "server-only";

import { getDb, nowIso } from "@/lib/db/client";
import type { ProfessorRow, StudentRow } from "./types";

/**
 * Profiles for both roles.
 *
 * Every field is optional, which is the point: a profile accrues. The completeness
 * indicator exists so the accrual is visible rather than nagging — it shows what is
 * filled, not what is missing.
 *
 * No file storage is connected in this build, so a photo is a URL or nothing.
 * `initials()` gives the UI something dignified to render either way, rather than a
 * broken image.
 */

// Field definitions. One source of truth for the form, the display and the
// completeness calculation, so they cannot drift apart.

export type ProfileField<T> = {
  key: keyof T & string;
  label: string;
  hint?: string;
  /** Long-form fields render as a textarea and display as a paragraph. */
  long?: boolean;
  /** Counted towards completeness. Name and email are already captured elsewhere. */
  scored?: boolean;
  type?: "text" | "email" | "url" | "tel";
};

export const PROFESSOR_FIELDS: ProfileField<ProfessorRow>[] = [
  { key: "title", label: "Title", hint: "Associate Professor of Historical Theology", scored: true },
  { key: "department", label: "Department", scored: true },
  { key: "email", label: "Email", type: "email", scored: true },
  { key: "office", label: "Office", hint: "Building and room", scored: true },
  { key: "phone", label: "Phone", type: "tel", scored: true },
  { key: "office_hours", label: "Office hours", hint: "Tuesdays 2–4 p.m., or by appointment", scored: true },
  { key: "photo_url", label: "Photo URL", type: "url", hint: "No file upload is connected, so this takes a link. Left blank, your initials are used." },
  { key: "website", label: "Website", type: "url", scored: true },
  { key: "linkedin", label: "LinkedIn", type: "url", scored: true },
  { key: "bio", label: "Biography", long: true, scored: true },
  { key: "academic_interests", label: "Academic interests", long: true, scored: true },
  { key: "research_areas", label: "Research areas", long: true, scored: true },
  { key: "credentials", label: "Credentials", long: true, hint: "Degrees and where they were taken", scored: true },
  { key: "teaching_philosophy", label: "Teaching philosophy", long: true, scored: true },
  { key: "calendar_availability", label: "Calendar availability", long: true, hint: "How students should book time with you. No calendar system is connected — this is read by people.", scored: true },
];

export const STUDENT_FIELDS: ProfileField<StudentRow>[] = [
  { key: "preferred_name", label: "Preferred name", hint: "What you would like to be called", scored: true },
  { key: "legal_name", label: "Legal name", hint: "Only if it differs from your preferred name", scored: true },
  { key: "email", label: "Email", type: "email", scored: true },
  { key: "student_id_number", label: "Student ID", scored: true },
  { key: "program", label: "Program", hint: "Master of Divinity, for example", scored: true },
  { key: "degree", label: "Degree", scored: true },
  { key: "year_of_study", label: "Year of study", scored: true },
  { key: "expected_graduation", label: "Expected graduation", scored: true },
  { key: "advisor", label: "Advisor", scored: true },
  { key: "photo_url", label: "Photo URL", type: "url", hint: "No file upload is connected, so this takes a link. Left blank, your initials are used." },
  { key: "timezone", label: "Time zone", hint: "So times shown to you make sense", scored: true },
  { key: "church", label: "Church", long: true, scored: true },
  { key: "ministry", label: "Ministry context", long: true, hint: "Where the work you are training for happens", scored: true },
  { key: "learning_preferences", label: "Learning preferences", long: true, hint: "How you study best. Read by your professor, not by an algorithm.", scored: true },
  { key: "accessibility_needs", label: "Accessibility needs", long: true, hint: "Anything that would make the course more usable for you.", scored: true },
  { key: "notification_preferences", label: "Notification preferences", long: true, hint: "Recorded for when notifications are built. Nothing is sent today.", scored: true },
];

// Completeness ----------------------------------------------------------------

export type Completeness = {
  filled: number;
  total: number;
  share: number;
  /** Fields still empty, in form order. */
  missing: string[];
};

export function completeness<T extends Record<string, unknown>>(
  row: T,
  fields: ProfileField<T>[],
): Completeness {
  const scored = fields.filter((field) => field.scored);
  const filled = scored.filter((field) => {
    const value = row[field.key];
    return typeof value === "string" && value.trim().length > 0;
  });

  return {
    filled: filled.length,
    total: scored.length,
    share: scored.length === 0 ? 1 : filled.length / scored.length,
    missing: scored
      .filter((field) => !filled.includes(field))
      .map((field) => field.label),
  };
}

/** Initials for the avatar fallback. Handles one-word and multi-word names. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Writes -----------------------------------------------------------------------

function applyUpdate(
  table: "professors" | "students",
  id: string,
  patch: Record<string, string | null>,
  allowed: string[],
) {
  const entries = Object.entries(patch).filter(([key]) => allowed.includes(key));
  if (entries.length === 0) return;

  const db = getDb();
  const assignments = entries.map(([key]) => `${key} = ?`).join(", ");
  db.prepare(
    `UPDATE ${table} SET ${assignments}, profile_updated_at = ? WHERE id = ?`,
  ).run(...entries.map(([, value]) => value), nowIso(), id);
}

export function updateProfessorProfile(
  professorId: string,
  patch: Record<string, string | null>,
) {
  applyUpdate(
    "professors",
    professorId,
    patch,
    ["name", ...PROFESSOR_FIELDS.map((f) => f.key)],
  );
}

export function updateStudentProfile(
  studentId: string,
  patch: Record<string, string | null>,
) {
  const db = getDb();

  // A student's name is how their other enrolments are found, so a rename has to
  // carry across every course they are in — otherwise they silently lose access to
  // their own work in the others. See enrolledCourses() for why this matching exists.
  const current = db
    .prepare<[string], { name: string }>("SELECT name FROM students WHERE id = ?")
    .get(studentId);

  applyUpdate(
    "students",
    studentId,
    patch,
    ["name", ...STUDENT_FIELDS.map((f) => f.key)],
  );

  const next = patch.name?.trim();
  if (current && next && next.toLowerCase() !== current.name.toLowerCase()) {
    db.prepare("UPDATE students SET name = ? WHERE LOWER(name) = LOWER(?)").run(
      next,
      current.name,
    );
  }
}

export function getStudentProfile(studentId: string): StudentRow | null {
  return (
    getDb()
      .prepare<[string], StudentRow>("SELECT * FROM students WHERE id = ?")
      .get(studentId) ?? null
  );
}
