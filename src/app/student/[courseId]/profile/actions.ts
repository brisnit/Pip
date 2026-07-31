"use server";

import { revalidatePath } from "next/cache";
import { actionFailure, actionSuccess, type ActionState } from "@/lib/forms/action-state";
import { STUDENT_FIELDS, updateStudentProfile } from "@/lib/repositories/profiles";
import { currentStudent } from "@/lib/role/role-context";

export async function saveStudentProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const student = await currentStudent();
  if (!student) {
    return actionFailure(
      "Your session has expired. Rejoin the course from its link and try again.",
    );
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) {
    return actionFailure("Enter your name so your professor can identify your work.");
  }

  const patch: Record<string, string | null> = { name };
  for (const field of STUDENT_FIELDS) {
    const value = String(formData.get(field.key) ?? "").trim();
    patch[field.key] = value === "" ? null : value;
  }

  const email = patch.email;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return actionFailure("That email address does not look right.");
  }

  const photo = patch.photo_url;
  if (photo) {
    try {
      const url = new URL(photo);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      return actionFailure("Photo URL must be a valid http:// or https:// link.");
    }
  }

  updateStudentProfile(student.studentId, patch);
  revalidatePath(`/student/${student.courseId}`, "layout");
  return actionSuccess("Profile saved.");
}
