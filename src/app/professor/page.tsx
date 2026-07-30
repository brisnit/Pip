import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Professor portal" };

/**
 * The professor entry point.
 *
 * There is nothing to sign in to yet, so this redirects straight to the
 * dashboard. When authentication arrives, this route becomes the sign-in screen
 * and the redirect becomes conditional — no other route changes.
 */
export default function ProfessorEntryPage() {
  redirect("/professor/dashboard");
}
