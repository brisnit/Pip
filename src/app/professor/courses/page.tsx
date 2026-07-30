import type { Metadata } from "next";
import Link from "next/link";
import { ProfessorShell } from "@/components/layout/shells";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  DemoBadge,
  EmptyState,
  SectionHeading,
} from "@/components/ui/primitives";
import { COURSE_FORMAT_LABELS } from "@/lib/domain/vocabulary";
import { formatDate, pluralize } from "@/lib/format";
import { listCourses } from "@/lib/repositories/courses";
import { requireProfessor } from "@/lib/role/role-context";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage() {
  const { professor } = requireProfessor();
  const courses = listCourses(professor.id);

  return (
    <ProfessorShell professorName={professor.name}>
      <SectionHeading
        level={1}
        title="Courses"
        description="Each course has its own student access code, materials, lectures and roster."
        action={<ButtonLink href="/professor/courses/new">Create course</ButtonLink>}
      />

      {courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Create a course to generate a student access link and QR code."
          action={<ButtonLink href="/professor/courses/new">Create course</ButtonLink>}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {courses.map((course) => (
            <Card as="li" key={course.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.78rem] font-medium uppercase tracking-wide text-burgundy-600">
                      {course.code}
                    </p>
                    <h2 className="mt-1 font-serif text-xl leading-snug">
                      <Link
                        href={`/professor/courses/${course.id}`}
                        className="no-underline hover:underline"
                      >
                        {course.title}
                      </Link>
                    </h2>
                  </div>
                  {course.is_demo === 1 ? <DemoBadge /> : null}
                </div>

                {course.description ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-500">
                    {course.description}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge>{COURSE_FORMAT_LABELS[course.format]}</Badge>
                  {course.term ? <Badge>{course.term}</Badge> : null}
                  {course.access_code ? (
                    <Badge tone="burgundy">Code {course.access_code}</Badge>
                  ) : (
                    <Badge tone="attention">No active code</Badge>
                  )}
                </div>

                <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-sand-100 pt-3 text-[0.82rem] text-ink-500">
                  <div className="flex gap-1.5">
                    <dt>Students</dt>
                    <dd className="font-medium text-ink-700">
                      {course.student_count}
                    </dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>Lectures</dt>
                    <dd className="font-medium text-ink-700">
                      {course.lecture_count}
                    </dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>Modules</dt>
                    <dd className="font-medium text-ink-700">
                      {course.module_count}
                    </dd>
                  </div>
                  {course.start_date ? (
                    <div className="flex gap-1.5">
                      <dt>Begins</dt>
                      <dd className="font-medium text-ink-700">
                        {formatDate(course.start_date)}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[0.85rem]">
                  <Link href={`/professor/courses/${course.id}/students`}>
                    {pluralize(course.student_count, "student")} →
                  </Link>
                  <Link href={`/professor/courses/${course.id}/content`}>
                    Content →
                  </Link>
                  <Link href={`/professor/courses/${course.id}/insights`}>
                    Comprehension →
                  </Link>
                </p>
              </CardBody>
            </Card>
          ))}
        </ul>
      )}
    </ProfessorShell>
  );
}
