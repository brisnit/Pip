"use server";

import { revalidatePath } from "next/cache";
import { actionFailure, actionSuccess, type ActionState } from "@/lib/forms/action-state";
import {
  PROFESSOR_FIELDS,
  updateProfessorProfile,
} from "@/lib/repositories/profiles";
import { requireProfessor } from "@/lib/role/role-context";

export async function saveProfessorProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { professor } = requireProfessor();

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) {
    return actionFailure("Enter your name — it appears on every course you teach.");
  }

  const patch: Record<string, string | null> = { name };
  for (const field of PROFESSOR_FIELDS) {
    const value = String(formData.get(field.key) ?? "").trim();
    patch[field.key] = value === "" ? null : value;
  }

  for (const field of PROFESSOR_FIELDS) {
    if (field.type !== "url") continue;
    const value = patch[field.key];
    if (!value) continue;
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      return actionFailure(`${field.label} must be a valid http:// or https:// URL.`);
    }
  }

  updateProfessorProfile(professor.id, patch);
  revalidatePath("/professor/profile");
  revalidatePath("/professor/dashboard");
  return actionSuccess("Profile saved.");
}
