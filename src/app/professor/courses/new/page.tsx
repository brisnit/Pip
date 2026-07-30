import type { Metadata } from "next";
import Link from "next/link";
import { ProfessorShell } from "@/components/layout/shells";
import { SectionHeading } from "@/components/ui/primitives";
import { requireProfessor } from "@/lib/role/role-context";
import { CourseForm } from "./course-form";

export const metadata: Metadata = { title: "Create a course" };

export default async function NewCoursePage() {
  const { professor } = requireProfessor();

  return (
    <ProfessorShell professorName={professor.name}>
      <p className="mb-2 text-[0.85rem]">
        <Link href="/professor/courses">← Courses</Link>
      </p>
      <SectionHeading
        level={1}
        title="Create a course"
        description="Only the title and code are required. Everything else can be filled in later, or drafted from your syllabus."
      />
      <CourseForm />
    </ProfessorShell>
  );
}
