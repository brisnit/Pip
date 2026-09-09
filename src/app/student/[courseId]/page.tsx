import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { HealthWheel, type WheelSegment } from "@/components/viz/health-wheel";
import { AIInsight, FeatureCard, LearningCard } from "@/components/ui/cards";
import { ButtonLink, EmptyState } from "@/components/ui/primitives";
import { StatusPill } from "@/components/ui/status";
import { LEARNING_BANDS, LEARNING_PRESENTATION } from "@/lib/domain/health";
import { percent } from "@/lib/format";
import { getCourse } from "@/lib/repositories/courses";
import { studentOverview } from "@/lib/repositories/student-overview";
import { currentStudentInCourse } from "@/lib/role/role-context";

export const metadata: Metadata = { title: "Your learning" };

/**
 * The learner's home.
 *
 * It answers three questions in the order a person actually asks them: what should I
 * do next, how am I doing, and what is the system noticing about me. The greeting and
 * the hero card come first because the answer to the first question is the whole
 * point; the numbers follow.
 *
 * Everything on this page is computed from recorded activity. Nothing is a literal,
 * and where there is no evidence the page says so rather than showing a zero that
 * looks like a judgement.
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
  const { learning, continueWith } = overview;

  const firstName = student.studentName.split(/\s+/)[0];

  const segments: WheelSegment[] = LEARNING_BANDS.map((band) => {
    const presentation = LEARNING_PRESENTATION[band];
    return {
      key: band,
      label: presentation.label,
      glyph: presentation.glyph,
      tone: presentation.tone,
      value: learning.counts[band],
      href: `/student/${courseId}/readiness`,
      detail: {
        heading: presentation.label,
        items: learning.topics[band],
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

  /*
    The one line of predictive framing on this screen, and it is only shown when the
    model has something to say. "Recommended for you" over an empty recommendation is
    exactly the kind of hollow intelligence the direction warns against.
  */
  const weakest = learning.topics.needs_review[0];

  return (
    <>
      <header className="pt-2">
        <p className="text-[1.05rem] text-ink-400">Hello, {firstName}</p>
        <h1 className="mt-1.5 max-w-[14ch] text-[2.75rem] font-medium leading-[0.98] tracking-[-0.04em] sm:text-[3.5rem]">
          Your learning journey
        </h1>
      </header>

      {continueWith ? (
        <FeatureCard
          className="mt-9"
          eyebrow={continueWith.live ? "Live now" : "Continue learning"}
          title={continueWith.label}
          description={continueWith.why}
          href={continueWith.href}
          actionLabel={`Continue: ${continueWith.label}`}
          motif="orbit"
          seedId="home"
          stats={[
            {
              label: "Course",
              value: (
                <span className="text-[1.35rem]">
                  {continueWith.course.code}
                </span>
              ),
            },
            { label: "Lessons", value: continueWith.lessonCount },
            {
              label: "Readiness",
              value:
                continueWith.readiness !== null
                  ? percent(continueWith.readiness)
                  : "—",
            },
          ]}
        />
      ) : null}

      {weakest ? (
        <AIInsight
          className="mt-4"
          title={`Let's reinforce ${weakest}`}
          href={`/student/${courseId}/readiness`}
          actionLabel="See what your work suggests"
          provenance="Drawn from your own answers, confidence ratings and the moments you marked confusing."
        >
          Your recorded work suggests this is where another pass would help
          most.
        </AIInsight>
      ) : null}

      <section className="mt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[1.6rem] font-medium tracking-[-0.028em]">
              How you&rsquo;re doing
            </h2>
            <p className="mt-1 text-[0.92rem] text-ink-400">
              {course.code} · {course.title}
            </p>
          </div>
          <Link
            href={`/student/${courseId}/readiness`}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-paper-200 px-4 text-[0.88rem] text-ink-700 no-underline transition-colors hover:bg-paper-300"
          >
            Full detail
            <ArrowRight size={15} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
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
              className="border-0 shadow-none"
              title="Nothing to show yet"
              description="Work through a lecture and answer a few comprehension checks. This fills in as soon as there is something real to report."
              action={
                continueWith ? (
                  <ButtonLink href={continueWith.href}>
                    Open a lecture
                  </ButtonLink>
                ) : null
              }
            />
          )}
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-[1.6rem] font-medium tracking-[-0.028em]">
            My courses
          </h2>
          <p className="text-[0.88rem] text-ink-400">
            {overview.courses.length}{" "}
            {overview.courses.length === 1 ? "course" : "courses"}
          </p>
        </div>

        <ul className="grid gap-5 md:grid-cols-2">
          {overview.courses.map((row) => (
            <li key={row.course.id}>
              <LearningCard
                className="h-full"
                eyebrow={row.course.code}
                title={row.course.title}
                description={row.course.professor_name}
                href={`/student/${row.course.id}`}
                badge={<StatusPill status={row.status} size="sm" />}
                progress={row.readiness ?? undefined}
                progressLabel="Readiness"
                progressTone={
                  row.status === "on_track"
                    ? "track"
                    : row.status === "support_recommended"
                      ? "concern"
                      : "brand"
                }
                meta={
                  <>
                    <span>
                      {row.lessonCount}{" "}
                      {row.lessonCount === 1 ? "lesson" : "lessons"}
                    </span>
                    {row.nextUp ? (
                      <span className="min-w-0 truncate">
                        Next: {row.nextUp.label}
                      </span>
                    ) : null}
                  </>
                }
              />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
