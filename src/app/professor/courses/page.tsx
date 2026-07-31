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
  Meter,
  SectionHeading,
} from "@/components/ui/primitives";
import {
  COURSE_HEALTH_BANDS,
  COURSE_HEALTH_PRESENTATION,
  type CourseHealth,
} from "@/lib/domain/health";
import { COURSE_FORMAT_LABELS } from "@/lib/domain/vocabulary";
import { pluralize } from "@/lib/format";
import { facultyOverview } from "@/lib/repositories/overview";
import { requireProfessor } from "@/lib/role/role-context";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ health?: string }>;
}) {
  const { professor } = requireProfessor();
  const { health } = await searchParams;
  const overview = facultyOverview(professor.id);

  const active = COURSE_HEALTH_BANDS.includes(health as CourseHealth)
    ? (health as CourseHealth)
    : null;

  const visible = active
    ? overview.courses.filter((row) => row.health === active)
    : overview.courses;

  return (
    <ProfessorShell professorName={professor.name}>
      <SectionHeading
        level={1}
        title="Courses"
        description="Each course has its own student access code, materials, lectures and roster."
        action={
          <ButtonLink href="/professor/courses/new">Create course</ButtonLink>
        }
      />

      {overview.courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Create a course to generate a student access link and QR code."
          action={
            <ButtonLink href="/professor/courses/new">Create course</ButtonLink>
          }
        />
      ) : (
        <>
          <nav aria-label="Filter by health" className="mb-6">
            <ul className="flex flex-wrap items-center gap-2">
              <li>
                <FilterChip href="/professor/courses" active={active === null}>
                  All ({overview.courses.length})
                </FilterChip>
              </li>
              {COURSE_HEALTH_BANDS.filter(
                (band) =>
                  band !== "no_data" || overview.courseHealthCounts.no_data > 0,
              ).map((band) => (
                <li key={band}>
                  <FilterChip
                    href={`/professor/courses?health=${band}`}
                    active={active === band}
                  >
                    <span aria-hidden="true" className="mr-1.5">
                      {COURSE_HEALTH_PRESENTATION[band].glyph}
                    </span>
                    {COURSE_HEALTH_PRESENTATION[band].label} (
                    {overview.courseHealthCounts[band]})
                  </FilterChip>
                </li>
              ))}
            </ul>
          </nav>

          {visible.length === 0 ? (
            <EmptyState
              title="No courses in this band"
              description="Try clearing the filter."
            />
          ) : (
            <ul className="grid gap-5 md:grid-cols-2">
              {visible.map(({ course, health: band, counts }) => {
                const presentation = COURSE_HEALTH_PRESENTATION[band];
                return (
                  <Card
                    as="li"
                    key={course.id}
                    className="transition-shadow hover:shadow-lift"
                  >
                    <CardBody>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[0.78rem] font-medium uppercase tracking-wide text-brand-600">
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
                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.75rem] font-medium ${
                            {
                              track: "border-track-200 bg-track-50 text-track-600",
                              attention:
                                "border-attention-200 bg-attention-50 text-attention-600",
                              concern:
                                "border-concern-200 bg-concern-50 text-concern-600",
                              unknown:
                                "border-unknown-200 bg-unknown-50 text-unknown-600",
                            }[presentation.tone]
                          }`}
                        >
                          <span aria-hidden="true">{presentation.glyph}</span>
                          {presentation.label}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge>{COURSE_FORMAT_LABELS[course.format]}</Badge>
                        {course.term ? <Badge>{course.term}</Badge> : null}
                        {course.access_code ? (
                          <Badge tone="brand">Code {course.access_code}</Badge>
                        ) : null}
                        {course.is_demo === 1 ? <DemoBadge /> : null}
                      </div>

                      {counts.total > 0 ? (
                        <div className="mt-5">
                          <Meter
                            label="Students ready"
                            value={counts.ready}
                            max={counts.total}
                            valueText={`${counts.ready} of ${counts.total}`}
                            tone={
                              band === "healthy"
                                ? "track"
                                : band === "needs_attention"
                                  ? "concern"
                                  : "attention"
                            }
                          />
                          <p className="mt-2 text-[0.8rem] text-ink-500">
                            {counts.developing} developing ·{" "}
                            {counts.needsSupport} need support
                            {counts.noData > 0
                              ? ` · ${counts.noData} without enough data`
                              : ""}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-5 text-[0.85rem] text-ink-500">
                          No students have joined yet.
                        </p>
                      )}

                      <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-tan-100 pt-4 text-[0.85rem]">
                        <Link href={`/professor/courses/${course.id}/students`}>
                          {pluralize(counts.total, "student")} →
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
                );
              })}
            </ul>
          )}
        </>
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
