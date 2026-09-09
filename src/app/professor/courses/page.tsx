import type { Metadata } from "next";
import Link from "next/link";
import { ProfessorShell } from "@/components/layout/shells";
import { LearningCard } from "@/components/ui/cards";
import {
  ButtonLink,
  DemoBadge,
  EmptyState,
  SectionHeading,
} from "@/components/ui/primitives";
import {
  COURSE_HEALTH_BANDS,
  COURSE_HEALTH_PRESENTATION,
  type CourseHealth,
} from "@/lib/domain/health";
import { COURSE_FORMAT_LABELS } from "@/lib/domain/vocabulary";
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
                  <li key={course.id}>
                    <LearningCard
                      className="h-full"
                      eyebrow={course.code}
                      title={course.title}
                      href={`/professor/courses/${course.id}`}
                      badge={
                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[0.76rem] font-medium ${
                            {
                              track: "bg-track-50 text-track-600",
                              attention: "bg-attention-50 text-attention-600",
                              concern: "bg-concern-50 text-concern-600",
                              unknown: "bg-unknown-50 text-unknown-600",
                            }[presentation.tone]
                          }`}
                        >
                          <span aria-hidden="true">{presentation.glyph}</span>
                          {presentation.label}
                        </span>
                      }
                      progress={
                        counts.total > 0
                          ? counts.ready / counts.total
                          : undefined
                      }
                      progressLabel="Students ready"
                      progressTone={
                        band === "healthy"
                          ? "track"
                          : band === "needs_attention"
                            ? "concern"
                            : "attention"
                      }
                      meta={
                        <>
                          <span>{COURSE_FORMAT_LABELS[course.format]}</span>
                          {course.term ? <span>{course.term}</span> : null}
                          {course.access_code ? (
                            <span>Code {course.access_code}</span>
                          ) : null}
                        </>
                      }
                      footer={
                        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
                          {counts.total > 0 ? (
                            <span className="text-[0.85rem] text-ink-500">
                              {counts.ready} of {counts.total} ready ·{" "}
                              {counts.developing} developing ·{" "}
                              {counts.needsSupport} need support
                              {counts.noData > 0
                                ? ` · ${counts.noData} without enough data`
                                : ""}
                            </span>
                          ) : (
                            <span className="text-[0.85rem] text-ink-500">
                              No students have joined yet.
                            </span>
                          )}
                          {course.is_demo === 1 ? <DemoBadge /> : null}
                        </div>
                      }
                    />
                  </li>
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
          ? "border-ink-900 bg-ink-900 font-medium text-white"
          : "border-slate-200 bg-white text-ink-600 hover:border-slate-500"
      }`}
    >
      {children}
    </Link>
  );
}
