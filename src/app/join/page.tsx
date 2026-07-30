import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/shells";
import { Card, CardBody, Notice } from "@/components/ui/primitives";
import { currentStudent } from "@/lib/role/role-context";
import { getCourse } from "@/lib/repositories/courses";
import { CourseCodeForm } from "./join-forms";

export const metadata: Metadata = { title: "Join a course" };

export default async function JoinPage() {
  const student = await currentStudent();
  const existingCourse = student ? getCourse(student.courseId) : null;

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
