import type { Metadata } from "next";
import Link from "next/link";
import { ProfessorShell } from "@/components/layout/shells";
import {
  Card,
  CardBody,
  EmptyState,
  SectionHeading,
} from "@/components/ui/primitives";
import { StatusPill } from "@/components/ui/status";
import {
  COHORT_BANDS,
  COHORT_PRESENTATION,
  cohortBandFor,
  type CohortBand,
} from "@/lib/domain/health";
import { attentionRank } from "@/lib/domain/readiness";
import { relativeTime } from "@/lib/format";
import { listCourses } from "@/lib/repositories/courses";
import { readinessForCourse } from "@/lib/repositories/readiness";
import { listRoster } from "@/lib/repositories/students";
import { requireProfessor } from "@/lib/role/role-context";

export const metadata: Metadata = { title: "Students" };

/**
 * Every student across every course, filterable by cohort band.
 *
 * This is where the student-health wheel lands. A student enrolled in two courses
 * appears twice, once per course, because readiness is per-course — someone can be
 * flying in Greek and struggling in Hermeneutics, and averaging those together would
 * hide exactly the thing worth seeing.
 */
export default async function FacultyStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ band?: string }>;
}) {
  const { professor } = requireProfessor();
  const { band } = await searchParams;

  const active = COHORT_BANDS.includes(band as CohortBand)
    ? (band as CohortBand)
    : null;

  const rows = listCourses(professor.id).flatMap((course) => {
    const roster = listRoster(course.id);
    const results = readinessForCourse(
      course.id,
      roster.map((s) => s.id),
    );
    return roster.map((student) => {
      const result = results.find((r) => r.studentId === student.id)!.result;
      return { course, student, result, band: cohortBandFor(result.status) };
    });
  });

  const counts = Object.fromEntries(
    COHORT_BANDS.map((b) => [b, rows.filter((r) => r.band === b).length]),
  ) as Record<CohortBand, number>;

  const visible = (active ? rows.filter((r) => r.band === active) : rows).sort(
    (a, b) =>
      attentionRank(a.result.status) - attentionRank(b.result.status) ||
      a.student.name.localeCompare(b.student.name),
  );

  return (
    <ProfessorShell professorName={professor.name}>
      <SectionHeading
        level={1}
        title="Students"
        description="Everyone across every course. A student appears once per course, because readiness is measured per course."
      />

      <nav aria-label="Filter by band" className="mb-6">
        <ul className="flex flex-wrap items-center gap-2">
          <li>
            <FilterChip href="/professor/students" active={active === null}>
              All ({rows.length})
            </FilterChip>
          </li>
          {COHORT_BANDS.map((b) => (
            <li key={b}>
              <FilterChip
                href={`/professor/students?band=${b}`}
                active={active === b}
              >
                <span aria-hidden="true" className="mr-1.5">
                  {COHORT_PRESENTATION[b].glyph}
                </span>
                {COHORT_PRESENTATION[b].label} ({counts[b]})
              </FilterChip>
            </li>
          ))}
        </ul>
      </nav>

      {visible.length === 0 ? (
        <EmptyState
          title="Nobody in this band"
          description="Try clearing the filter."
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">
                  Students across all courses, with their readiness status, course
                  and last recorded activity
                </caption>
                <thead>
                  <tr className="border-b border-tan-200 bg-paper-100 text-[0.78rem] uppercase tracking-wide text-ink-500">
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Student
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Course
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Needs review
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Last activity
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tan-100">
                  {visible.map(({ course, student, result }) => {
                    const gap = result.gaps.find(
                      (g) => g.standing === "needs_review",
                    );
                    return (
                      <tr key={`${course.id}-${student.id}`} className="align-top">
                        <th
                          scope="row"
                          className="px-4 py-3 text-left font-medium text-ink-800"
                        >
                          <Link
                            href={`/professor/courses/${course.id}/students/${student.id}`}
                          >
                            {student.name}
                          </Link>
                        </th>
                        <td className="px-4 py-3 text-ink-600">
                          <Link href={`/professor/courses/${course.id}`}>
                            {course.code}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={result.status} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-[0.85rem] text-ink-600">
                          {gap
                            ? (gap.confusingConcepts[0] ?? gap.objective.code)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-[0.82rem] text-ink-500">
                          {relativeTime(student.last_activity_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </ProfessorShell>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex rounded-full border px-3 py-1 text-[0.82rem] no-underline transition-colors ${
        active
          ? "border-cta-600 bg-cta-600 font-medium text-white"
          : "border-tan-200 bg-white text-ink-600 hover:border-tan-400"
      }`}
    >
      {children}
    </Link>
  );
}
