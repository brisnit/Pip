import "server-only";

import { cookies } from "next/headers";
import { getActiveProfessor } from "@/lib/repositories/courses";
import { resolveSession, touchSession } from "@/lib/repositories/students";
import type { ProfessorRow } from "@/lib/repositories/types";

/**
 * PrototypeRoleContext
 * ────────────────────
 * The single place the application asks "who is acting, and in what role?".
 *
 * There is no authentication in this prototype:
 *  - `professor` resolves to the seeded professor record, unconditionally.
 *  - `student` resolves from a signed-in-by-cookie prototype session.
 *
 * When real authentication arrives, `requireProfessor` and `currentStudent`
 * become session lookups and every route above them keeps working unchanged.
 * The future `administrator` and `teaching_assistant` roles slot in as
 * additional members of `Role` plus additional resolvers here.
 *
 * See docs/future-authentication-plan.md.
 */

export type Role = "professor" | "student" | "guest";

/** Roles the architecture anticipates but the prototype does not implement. */
export type PlannedRole = "administrator" | "teaching_assistant";

export const STUDENT_SESSION_COOKIE = "flc_student_session";

export type ProfessorContext = {
  role: "professor";
  professor: ProfessorRow;
  /** True while the prototype grants professor access without authenticating. */
  unauthenticated: true;
};

export type StudentContext = {
  role: "student";
  sessionId: string;
  studentId: string;
  courseId: string;
  studentName: string;
};

/**
 * Professor context. Never throws in the prototype — the seeded professor is
 * always present — but the signature is the one an authenticated version needs.
 */
export function requireProfessor(): ProfessorContext {
  return {
    role: "professor",
    professor: getActiveProfessor(),
    unauthenticated: true,
  };
}

/** The active prototype student session, if the browser holds one. */
export async function currentStudent(): Promise<StudentContext | null> {
  const store = await cookies();
  const sessionId = store.get(STUDENT_SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = resolveSession(sessionId);
  if (!session) return null;

  touchSession(session.sessionId);

  return {
    role: "student",
    sessionId: session.sessionId,
    studentId: session.studentId,
    courseId: session.courseId,
    studentName: session.studentName,
  };
}

/**
 * The student session, scoped to a course.
 *
 * Returns null when the browser holds a session for a *different* course, which
 * is how the join flow knows to ask for a name again.
 */
export async function currentStudentInCourse(
  courseId: string,
): Promise<StudentContext | null> {
  const student = await currentStudent();
  if (!student) return null;
  return student.courseId === courseId ? student : null;
}

/** Cookie options for the prototype session. Documented, not secure by design. */
export const studentSessionCookie = {
  name: STUDENT_SESSION_COOKIE,
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    // Seven days: long enough for a demo, short enough that stale prototype
    // sessions do not linger indefinitely.
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  },
};
