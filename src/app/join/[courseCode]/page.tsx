import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/layout/shells";
import {
  ButtonLink,
  Card,
  CardBody,
  DetailList,
  Notice,
} from "@/components/ui/primitives";
import { COURSE_FORMAT_LABELS } from "@/lib/domain/vocabulary";
import { findCourseByAccessCode } from "@/lib/repositories/courses";
import { listStudentLectures } from "@/lib/repositories/lectures";
import { currentStudentInCourse } from "@/lib/role/role-context";
import { EnterCourseForm } from "../join-forms";

type Params = { params: Promise<{ courseCode: string }> };
type Search = { searchParams: Promise<{ via?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { courseCode } = await params;
  const course = findCourseByAccessCode(courseCode);
  return { title: course ? `Join ${course.code}` : "Student portal" };
}

export default async function JoinCoursePage({
  params,
  searchParams,
}: Params & Search) {
  const { courseCode } = await params;
  const { via } = await searchParams;
  const course = findCourseByAccessCode(courseCode);

  if (!course) notFound();

  const existing = await currentStudentInCourse(course.id);
  const lectures = listStudentLectures(course.id);
  const source = via === "qr" ? "qr" : "link";

  return (
    <PublicShell>
      <p className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-brand-600">
        Joining a course
      </p>
      <h1 className="mt-2 font-serif text-3xl">
        {course.code} — {course.title}
      </h1>

      <Card className="mt-6">
        <CardBody>
          <DetailList
            items={[
              { label: "Professor", value: course.professor_name },
              { label: "Term", value: course.term },
              { label: "Format", value: COURSE_FORMAT_LABELS[course.format] },
              {
                label: "Meets",
                value: [course.meeting_days, course.meeting_time]
                  .filter(Boolean)
                  .join(", "),
              },
              { label: "Location", value: course.location },
              {
                label: "Published lectures",
                value: `${lectures.length}`,
              },
            ]}
          />
          {course.description ? (
            <p className="mt-5 border-t border-tan-100 pt-5 text-sm leading-relaxed text-ink-600">
              {course.description}
            </p>
          ) : null}
        </CardBody>
      </Card>

      {existing ? (
        <Notice tone="info" title="You are already in this course" className="mt-6">
          <p>
            You are signed in as <strong>{existing.studentName}</strong>.
          </p>
          <p className="mt-3">
            <ButtonLink href={`/student/${course.id}`} size="sm">
              Continue as {existing.studentName}
            </ButtonLink>
          </p>
          <p className="mt-3 text-[0.85em]">
            Not you? Enter a different name below.
          </p>
        </Notice>
      ) : null}

      <section className="mt-8">
        <h2 className="font-serif text-xl">Your details</h2>
        <Card className="mt-3">
          <CardBody>
            <EnterCourseForm
              accessCode={course.access_code ?? courseCode}
              source={source}
              defaultName={existing?.studentName}
            />
          </CardBody>
        </Card>
      </section>

      <Notice tone="privacy" title="What your professor will and will not see" className="mt-8">
        <p>
          Your professor sees aggregated comprehension data, questions you choose
          to submit, notes you explicitly share, your assessment responses, and
          any support you request.
        </p>
        <p className="mt-2">
          Your private notes stay private. Nothing you write in the notes panel is
          visible to your professor unless you press the share control on that
          specific note.
        </p>
      </Notice>

      <p className="mt-8">
        <Link href="/join">← Enter a different course code</Link>
      </p>
    </PublicShell>
  );
}
