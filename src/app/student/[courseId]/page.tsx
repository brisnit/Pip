import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HealthWheel, type WheelSegment } from "@/components/viz/health-wheel";
import { ButtonLink, EmptyState } from "@/components/ui/primitives";
import { StatusPill } from "@/components/ui/status";
import { LEARNING_BANDS, LEARNING_PRESENTATION } from "@/lib/domain/health";
import { percent } from "@/lib/format";
import { getCourse } from "@/lib/repositories/courses";
import { studentOverview } from "@/lib/repositories/student-overview";
import { currentStudentInCourse } from "@/lib/role/role-context";

export const metadata: Metadata = { title: "Your learning" };

/**
 * The student's launchpad.
 *
 * Three things: how your learning is going, what you are taking, and the one thing
 * worth doing next. Notes, readiness detail, assessments and the support plan all
 * still exist — they are one click away, on pages built for them.
 */
export default async function StudentHome({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  const student = await currentStudentInCourse(courseId);
  if (!course || !student) notFound();

  const overview = studentOverview(courseId, student.studentId);
  const { learning } = overview;

  const firstName = student.studentName.split(/\s+/)[0];

  const segments: WheelSegment[] = LEARNING_BANDS.map((band) => {
    const presentation = LEARNING_PRESENTATION[band];
    const topics = learning.topics[band];
    return {
      key: band,
      label: presentation.label,
      glyph: presentation.glyph,
      tone: presentation.tone,
      value: learning.counts[band],
      href: `/student/${courseId}/readiness`,
      detail: {
        heading: presentation.label,
        items: topics,
        empty:
          band === "needs_review"
            ? "Nothing is flagged for review."
            : "Nothing here yet — answer a few comprehension checks.",
      },
    };
  });

  const hasEvidence =
    learning.readiness !== null ||
    Object.values(learning.counts).some((n) => n > 0);

  return (
    <>
      <header className="pt-2">
        <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          Hello {firstName}
        </h1>
        <p className="mt-3 text-lg text-ink-500">Continue your learning.</p>
      </header>

      <section className="rise mt-10 rounded-2xl border border-tan-100 bg-white p-6 shadow-soft sm:p-8">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl">Learning health</h2>
            <p className="mt-1 text-[0.88rem] text-ink-500">
              {course.code} — {course.title}
            </p>
          </div>
          <Link
            href={`/student/${courseId}/readiness`}
            className="shrink-0 text-[0.85rem]"
          >
            Full detail →
          </Link>
        </div>

        {hasEvidence ? (
          <HealthWheel
            size="lg"
            segments={segments}
            centerValue={
              learning.readiness !== null ? percent(learning.readiness) : "—"
            }
            centerLabel={
              learning.readiness !== null
                ? "current readiness"
                : "not enough activity yet"
            }
            caption={
              learning.unassessed.length > 0
                ? `${learning.unassessed.length} topic${
                    learning.unassessed.length === 1 ? "" : "s"
                  } not assessed yet — not counted for or against you.`
                : undefined
            }
          />
        ) : (
          <EmptyState
            title="Nothing to show yet"
            description="Work through a lecture and answer a few comprehension checks. This fills in as soon as there is something real to report."
            action={
              overview.continueWith ? (
                <ButtonLink href={overview.continueWith.href}>
                  Open a lecture
                </ButtonLink>
              ) : null
            }
          />
        )}
      </section>

      {overview.continueWith ? (
        <section className="rise rise-2 mt-6 rounded-2xl border border-cta-600 bg-cta-600 p-6 text-white shadow-[0_2px_20px_rgba(0,89,121,0.18)] sm:p-8">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-white/70">
            Continue learning
          </p>
          <h2 className="mt-2 font-serif text-2xl leading-snug">
            {overview.continueWith.label}
          </h2>
          <p className="mt-2 text-[0.92rem] text-white/80">
            {overview.continueWith.why}
          </p>
          <p className="mt-5">
            <ButtonLink
              href={overview.continueWith.href}
              size="lg"
              className="border-white bg-white text-cta-700 hover:border-paper-100 hover:bg-paper-100"
            >
              Continue →
            </ButtonLink>
          </p>
        </section>
      ) : null}

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-serif text-xl">My courses</h2>
          <p className="text-[0.85rem] text-ink-400">
            {overview.courses.length}{" "}
            {overview.courses.length === 1 ? "course" : "courses"}
          </p>
        </div>

        <ul className="grid gap-5 md:grid-cols-2">
          {overview.courses.map((row) => (
            <li key={row.course.id}>
              <Link
                href={`/student/${row.course.id}`}
                className="group block h-full rounded-2xl border border-tan-100 bg-white p-6 no-underline shadow-[0_1px_3px_rgba(4,43,50,0.04)] transition-shadow hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.78rem] font-medium uppercase tracking-wide text-brand-600">
                      {row.course.code}
                    </p>
                    <h3 className="mt-1 font-serif text-lg leading-snug text-ink-900 group-hover:underline">
                      {row.course.title}
                    </h3>
                    <p className="mt-1 text-[0.85rem] text-ink-500">
                      {row.course.professor_name}
                    </p>
                  </div>
                  <StatusPill status={row.status} size="sm" />
                </div>

                <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-tan-100 pt-4 text-[0.85rem]">
                  <div>
                    <dt className="text-ink-400">Readiness</dt>
                    <dd className="mt-0.5 font-medium text-ink-800">
                      {row.readiness !== null ? percent(row.readiness) : "—"}
                    </dd>
                  </div>
                  {row.nextUp ? (
                    <div className="min-w-0">
                      <dt className="text-ink-400">Next up</dt>
                      <dd className="mt-0.5 truncate font-medium text-ink-800">
                        {row.nextUp.label}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
