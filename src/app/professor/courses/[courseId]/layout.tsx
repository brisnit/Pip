import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  ProfessorShell,
  professorCourseNav,
} from "@/components/layout/shells";
import { getCourse } from "@/lib/repositories/courses";
import { requireProfessor } from "@/lib/role/role-context";

export default async function CourseLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { professor } = requireProfessor();
  const course = getCourse(courseId);

  if (!course) notFound();

  return (
    <ProfessorShell
      professorName={professor.name}
      courseNav={professorCourseNav(courseId)}
      courseTitle={course.title}
      courseCode={course.code}
    >
      {children}
    </ProfessorShell>
  );
}
