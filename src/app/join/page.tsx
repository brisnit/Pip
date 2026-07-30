import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/shells";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  DemoBadge,
  Notice,
} from "@/components/ui/primitives";
import { currentStudent } from "@/lib/role/role-context";
import { getCourse, listDemoCourses } from "@/lib/repositories/courses";
import { CourseCodeForm } from "./join-forms";

export const metadata: Metadata = { title: "Join a course" };

// Reads the live course list, so it must not be prerendered.
export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const student = await currentStudent();
  const existingCourse = student ? getCourse(student.courseId) : null;
  const demoCourses = listDemoCourses();

  return (
    <PublicShell>
      <h1 className="font-serif text-3xl">Join a course</h1>
      <p className="mt-3 text-ink-600">
        Scan the QR code your professor displays, open the course link, or enter
        the course code below. No account is needed.
      </p>

      {student && existingCourse ? (
        <Notice tone="info" title="You are already in a course" className="mt-6">
          You have an active prototype session for{" "}
          <strong>
            {existingCourse.code} — {existingCourse.title}
          </strong>
          .{" "}
          <Link href={`/student/${existingCourse.id}`}>
            Return to that course
          </Link>
          , or enter a different code below to switch.
        </Notice>
      ) : null}

      <Card className="mt-6">
        <CardBody>
          <CourseCodeForm />
        </CardBody>
      </Card>

      {demoCourses.length > 0 ? (
        <Card className="mt-6">
          <CardHeader
            title="Demonstration course"
            description="Seeded with this prototype so you can try the student experience without a professor sharing a code first."
            action={<DemoBadge />}
          />
          <CardBody className="space-y-4">
            {demoCourses.map((course) => (
              <div
                key={course.id}
                className="flex flex-wrap items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-800">
                    {course.code} — {course.title}
                  </p>
                  <p className="mt-0.5 text-[0.82rem] text-ink-500">
                    {course.professor_name} · {course.student_count} students
                    already joined
                  </p>
                  <p className="mt-1.5">
                    <Badge tone="burgundy">Code {course.access_code}</Badge>
                  </p>
                </div>
                <ButtonLink
                  href={`/join/${course.access_code}`}
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                >
                  Join {course.code}
                </ButtonLink>
              </div>
            ))}
            <p className="border-t border-sand-100 pt-4 text-[0.82rem] text-ink-500">
              Everything in this course is fictional demonstration data. A real
              course code would come from your professor, in class or by email — it
              would not be listed on a public page like this.
            </p>
          </CardBody>
        </Card>
      ) : null}

      <section className="mt-10">
        <h2 className="font-serif text-xl">Scanning a QR code</h2>
        <p className="mt-2 text-ink-600">
          Open your phone&rsquo;s camera and point it at the code on screen, then
          open the link it offers. If scanning does not work — the code is too far
          away, the room is dark, or you are using a screen reader — the six
          character course code is always printed beside the QR code and can be
          typed into the field above instead. Ask your professor to read it aloud
          if you cannot see the screen.
        </p>
      </section>

      <Notice tone="caution" title="Before you enter your name" className="mt-8">
        This prototype has no sign-in and no security. Anyone with the course link
        can enter, and anyone entering your name would appear as you. Do not put
        real student identifiers or anything sensitive into it.
      </Notice>
    </PublicShell>
  );
}
