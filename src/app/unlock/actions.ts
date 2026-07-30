"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  GATE_COOKIE,
  gateCookieOptions,
  gatePassword,
  gateToken,
  safeEqual,
} from "@/lib/gate/access";
import type { ActionState } from "@/lib/forms/action-state";

/** Only allow redirect targets inside this app, never an absolute URL. */
function safeNext(raw: unknown): string {
  const value = typeof raw === "string" ? raw : "";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value === "/unlock" || value.startsWith("/unlock?")) return "/";
  return value;
}

export async function unlockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const expected = gatePassword();
  const next = safeNext(formData.get("next"));

  // Gate switched off while the page was open — nothing to unlock.
  if (!expected) redirect(next);

  const supplied = String(formData.get("password") ?? "");
  if (!supplied) {
    return { error: "Enter the access password.", message: null };
  }

  if (!safeEqual(supplied, expected)) {
    // Deliberately vague, and deliberately slow enough to be tedious to script.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      error: "That password is not right. Check the message you were sent.",
      message: null,
    };
  }

  const store = await cookies();
  store.set(GATE_COOKIE, await gateToken(expected), gateCookieOptions);
  redirect(next);
}
