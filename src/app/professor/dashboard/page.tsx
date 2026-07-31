import type { Metadata } from "next";
import Link from "next/link";
import { ProfessorShell } from "@/components/layout/shells";
import { HealthWheel, type WheelSegment } from "@/components/viz/health-wheel";
import { ButtonLink, EmptyState } from "@/components/ui/primitives";
import {
  COHORT_PRESENTATION,
  COURSE_HEALTH_BANDS,
  COURSE_HEALTH_PRESENTATION,
  type CohortBand,
} from "@/lib/domain/health";
import { greeting, percent, salutation } from "@/lib/format";
import { coursesInBand, facultyOverview } from "@/lib/repositories/overview";
import { requireProfessor } from "@/lib/role/role-context";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The professor's launchpad.
 *
 * Four things and nothing else: who you are, how your courses are, how your students
 * are, and one way to start something new. Everything that used to live here —
 * rosters, question queues, confusion tables — still exists, one click away, on the
 * pages built for it.
 *
 * Every number is computed from recorded activity by `facultyOverview`. Nothing on
 * this page is a literal.
 */
export default async function ProfessorDashboard() {
  const { professor } = requireProfessor();
  const overview = facultyOverview(professor.id);

  if (overview.courses.length === 0) {
    return (
      <ProfessorShell professorName={professor.name}>
        <Welcome name={professor.name} term={null} />
        <EmptyState
          className="mt-10"
          title="Start with a course"
          description="Create a course to generate a student access link and QR code, then add a syllabus and your first lecture."
          action={
            <ButtonLink href="/professor/courses/new">Create new course</ButtonLink>
          }
        />
      </ProfessorShell>
    );
  }

  const term = overview.courses[0]?.course.term ?? null;

  // ── Course health ─────────────────────────────────────────────────────────
  const courseSegments: WheelSegment[] = COURSE_HEALTH_BANDS.filter(
    // Only show "not enough activity" when it actually applies to something.
    (band) => band !== "no_data" || overview.courseHealthCounts.no_data > 0,
  ).map((band) => {
    const presentation = COURSE_HEALTH_PRESENTATION[band];
    const titles = coursesInBand(overview, band);
    return {
      key: band,
      label: presentation.label,
      glyph: presentation.glyph,
      tone: presentation.tone,
      value: overview.courseHealthCounts[band],
      href: `/professor/courses?health=${band}`,
      detail: {
        heading: presentation.label,
        items: titles,
        empty: "No courses in this band.",
      },
    };
  });

  // ── Student health ────────────────────────────────────────────────────────
  const { cohort } = overview;

  const cohortDetail: Record<CohortBand, WheelSegment["detail"]> = {
    ready: {
      heading: "Ready",
      stats: [
        {
          label: "Average confidence",
          value:
            cohort.averageConfidence !== null
              ? `${cohort.averageConfidence.toFixed(1)} of 5`
              : "—",
        },
        {
          label: "Average readiness",
          value: cohort.averageReadiness !== null ? percent(cohort.averageReadiness) : "—",
        },
      ],
      empty: "No students are reading as ready yet.",
    },
    developing: {
      heading: "Developing",
      stats: [
        {
          label: "Share of cohort",
          value:
            cohort.total > 0
              ? percent(cohort.counts.developing / cohort.total)
              : "—",
        },
      ],
      items: cohort.commonStruggles.slice(0, 4).map((s) => s.label),
      empty: "Nobody is in this band.",
    },
    needs_support: {
      heading: "Needs support",
      stats: [
        {
          label: "Share of cohort",
          value:
            cohort.total > 0
              ? percent(cohort.counts.needs_support / cohort.total)
              : "—",
        },
      ],
      items: cohort.confusingConcepts.slice(0, 5).map((c) => `${c.name} (${c.count})`),
      empty: "Nobody has asked for support or fallen behind.",
    },
    no_data: {
      heading: "Not enough data yet",
      items: ["These students have not recorded enough activity to estimate."],
      empty: "Every student has recorded enough activity.",
    },
  };

  const cohortSegments: WheelSegment[] = (
    ["ready", "developing", "needs_support", "no_data"] as CohortBand[]
  ).map((band) => {
    const presentation = COHORT_PRESENTATION[band];
    return {
      key: band,
      label: presentation.label,
      glyph: presentation.glyph,
      tone: presentation.tone,
      value: cohort.counts[band],
      href: `/professor/students?band=${band}`,
      detail: cohortDetail[band],
    };
  });

  return (
    <ProfessorShell professorName={professor.name}>
      <Welcome
        name={professor.name}
        term={term}
        action={
          <ButtonLink href="/professor/courses/new" size="lg">
            + Create new course
          </ButtonLink>
        }
      />

      <div className="mt-12 grid gap-6 xl:grid-cols-2">
        <Panel
          title="Course health"
          subtitle="Across everything you are teaching"
          href="/professor/courses"
          hrefLabel="All courses"
        >
          <HealthWheel
            segments={courseSegments}
            centerValue={String(overview.courses.length)}
            centerLabel={overview.courses.length === 1 ? "course" : "courses"}
            caption="Course health is read from each class's readiness spread, not from a grade."
          />
        </Panel>

        <Panel
          title="Student health"
          subtitle="Everyone enrolled, across all courses"
          href="/professor/students"
          hrefLabel="All students"
        >
          <HealthWheel
            segments={cohortSegments}
            centerValue={String(cohort.total)}
            centerLabel={cohort.total === 1 ? "student" : "students"}
            caption="A student appears once per course they are enrolled in."
          />
        </Panel>
      </div>
    </ProfessorShell>
  );
}

/**
 * The greeting, with the one action worth taking from here beside it.
 *
 * `action` is optional because the empty state below leads with the same button —
 * offering it twice on a page with nothing else on it would be noise.
 */
function Welcome({
  name,
  term,
  action,
}: {
  name: string;
  term: string | null;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 pt-4">
      <div className="min-w-0">
        <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          {greeting()}, {salutation(name)}
        </h1>
        {term ? <p className="mt-3 text-lg text-ink-500">{term}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

function Panel({
  title,
  subtitle,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  subtitle: string;
  href: string;
  hrefLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rise rounded-2xl border border-tan-100 bg-white p-6 shadow-soft sm:p-8">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl">{title}</h2>
          <p className="mt-1 text-[0.88rem] text-ink-500">{subtitle}</p>
        </div>
        <Link href={href} className="shrink-0 text-[0.85rem]">
          {hrefLabel} →
        </Link>
      </div>
      {children}
    </section>
  );
}
