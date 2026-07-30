import type { ReactNode } from "react";

/**
 * Every professor screen reads live prototype data from SQLite on each request.
 * None of it is cacheable, and prerendering it at build time would bake in
 * course and student ids from the build-time database.
 */
export const dynamic = "force-dynamic";

export default function ProfessorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
