"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeCourseCode } from "@/lib/db/ids";
import { oneOf, ENTRY_SOURCES } from "@/lib/domain/vocabulary";
import { findCourseByAccessCode } from "@/lib/repositories/courses";
import { joinCourse } from "@/lib/repositories/students";
import { studentSessionCookie } from "@/lib/role/role-context";

export type JoinState = { error: string | null };

/** Step 1: look up a course by the code a student typed. */
export async function findCourseAction(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const raw = String(formData.get("code") ?? "");
  const code = normalizeCourseCode(raw);

  if (!code) {
    return { error: "Enter the course code your professor displayed." };
  }

  const course = findCourseByAccessCode(code);
  if (!course) {
    return {
      error: `No course found for the code "${raw.trim()}". Codes are six characters and are not case sensitive.`,
    };
  }

  redirect(`/join/${course.access_code}`);
}

/** Step 2: record the student's name and consent, then open the course. */
export async function enterCourseAction(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const accessCode = String(formData.get("accessCode") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const studentIdNumber = String(formData.get("studentIdNumber") ?? "").trim();
  const consented = formData.get("consent") === "on";
  const source = oneOf(ENTRY_SOURCES, formData.get("source"), "link");

  const course = findCourseByAccessCode(accessCode);
  if (!course) {
    return { error: "That course link is no longer valid. Ask your professor for a current code." };
  }

  if (name.length < 2) {
    return { error: "Enter your full name so your professor can identify your work." };
  }
  if (name.length > 80) {
    return { error: "That name is longer than this prototype accepts (80 characters)." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "That email address does not look right. Leave it blank if you prefer." };
  }
  if (!consented) {
    return {
      error:
        "Please confirm you understand this is a prototype before entering the course.",
    };
  }

  const { studentId, sessionId } = joinCourse({
    courseId: course.id,
    name,
    email: email || null,
    studentIdNumber: studentIdNumber || null,
    source,
    consented,
  });

  const store = await cookies();
  store.set(studentSessionCookie.name, sessionId, studentSessionCookie.options);

  void studentId;
  redirect(`/student/${course.id}`);
}
