import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PublicShell, StudentShell } from "@/components/layout/shells";
import { ButtonLink, Notice } from "@/components/ui/primitives";
import { getCourse } from "@/lib/repositories/courses";
import { currentStudentInCourse } from "@/lib/role/role-context";

/** Live prototype data plus a session cookie: never prerender these. */
export const dynamic = "force-dynamic";

export default async function StudentCourseLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  if (!course) notFound();

  const student = await currentStudentInCourse(courseId);

  // No session for this course: send the visitor through the join flow rather
  // than showing a half-populated portal.
  if (!student) {
    return (
      <PublicShell>
        <h1 className="font-serif text-2xl">
          {course.code} — {course.title}
        </h1>
        <Notice tone="info" title="Enter your name to open this course" className="mt-5">
          This prototype keeps your work against a browser session. There is no
          sign-in, so it needs your name to know whose notes and answers these are.
        </Notice>
        <div className="mt-6 flex flex-wrap gap-3">
          {course.access_code ? (
            <ButtonLink href={`/join/${course.access_code}`}>
              Join {course.code}
            </ButtonLink>
          ) : null}
          <ButtonLink href="/join" variant="secondary">
            Enter a course code
          </ButtonLink>
        </div>
        <p className="mt-6 text-[0.85rem]">
          <Link href="/">← Home</Link>
        </p>
      </PublicShell>
    );
  }

  return (
    <StudentShell
      studentName={student.studentName}
      courseId={courseId}
      courseTitle={course.title}
      courseCode={course.code}
      professorName={course.professor_name}
    >
      {children}
    </StudentShell>
  );
}
