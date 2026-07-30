import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Notice,
  SectionHeading,
} from "@/components/ui/primitives";
import {
  StatusDistribution,
  StatusLegend,
  StatusPill,
} from "@/components/ui/status";
import {
  READINESS_PRESENTATION,
  READINESS_STATUSES,
  type ReadinessStatus,
} from "@/lib/domain/vocabulary";
import { attentionRank } from "@/lib/domain/readiness";
import { percent, relativeTime } from "@/lib/format";
import { getCourse } from "@/lib/repositories/courses";
import {
  classAggregate,
  readinessForCourse,
} from "@/lib/repositories/readiness";
import { listRoster } from "@/lib/repositories/students";
import {
  listProfessorNotes,
  listRecommendations,
} from "@/lib/repositories/support";

export const metadata: Metadata = { title: "Students" };

type Props = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ status?: string; sort?: string }>;
};

const SORTS = {
  attention: "Needs attention first",
  name: "Name",
  activity: "Most recent activity",
} as const;

export default async function StudentsPage({ params, searchParams }: Props) {
  const { courseId } = await params;
  const query = await searchParams;

  const course = getCourse(courseId);
  if (!course) notFound();

  const roster = listRoster(courseId);
  const readiness = readinessForCourse(
    courseId,
    roster.map((student) => student.id),
  );
  const aggregate = classAggregate(courseId, readiness);
  const recommendations = listRecommendations(courseId);
  const professorNotes = listProfessorNotes(courseId);

  const statusFilter = READINESS_STATUSES.includes(
    query.status as ReadinessStatus,
  )
    ? (query.status as ReadinessStatus)
    : null;
  const sort = (query.sort ?? "attention") as keyof typeof SORTS;

  let rows = roster.map((student) => {
    const result = readiness.find((r) => r.studentId === student.id)!.result;
    const studentRecs = recommendations.filter(
      (rec) => rec.student_id === student.id,
    );
    const notes = professorNotes.filter((note) => note.student_id === student.id);

    return {
      student,
      result,
      recommendations: studentRecs,
      openFollowUps: notes.filter((note) => note.follow_up_status === "open")
        .length,
    };
  });

  if (statusFilter) {
    rows = rows.filter((row) => row.result.status === statusFilter);
  }

  rows.sort((a, b) => {
    if (sort === "name") return a.student.name.localeCompare(b.student.name);
    if (sort === "activity") {
      return (
        (b.student.last_activity_at ?? "").localeCompare(
          a.student.last_activity_at ?? "",
        ) || a.student.name.localeCompare(b.student.name)
      );
    }
    return (
      attentionRank(a.result.status) - attentionRank(b.result.status) ||
      (a.result.score ?? 1) - (b.result.score ?? 1) ||
      a.student.name.localeCompare(b.student.name)
    );
  });

  function filterHref(status: ReadinessStatus | null) {
    const search = new URLSearchParams();
    if (status) search.set("status", status);
    if (sort !== "attention") search.set("sort", sort);
    const qs = search.toString();
    return `/professor/courses/${courseId}/students${qs ? `?${qs}` : ""}`;
  }

  function sortHref(next: keyof typeof SORTS) {
    const search = new URLSearchParams();
    if (statusFilter) search.set("status", statusFilter);
    if (next !== "attention") search.set("sort", next);
    const qs = search.toString();
    return `/professor/courses/${courseId}/students${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      <SectionHeading
        level={1}
        title="Students"
        description="Prototype readiness signals from recorded coursework activity. Not grades, and not a judgement about any student."
      />

      <Notice tone="privacy" title="Demonstration functionality" className="mb-6">
        This screen shows student-shaped records with no authentication protecting
        them. Every student here is fictional. Do not put real student information
        into this prototype.
      </Notice>

      {roster.length === 0 ? (
        <EmptyState
          title="No students have joined yet"
          description="Share the course code or QR code from the course overview. Students appear here as soon as they enter."
        />
      ) : (
        <>
          <div className="mb-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Class summary"
                description={`${roster.length} students joined`}
              />
              <CardBody className="space-y-5">
                <StatusDistribution
                  counts={aggregate.counts}
                  total={aggregate.total}
                />
                {aggregate.hardestObjectives.length > 0 ? (
                  <div className="border-t border-tan-100 pt-5">
                    <h3 className="text-sm font-semibold">
                      Objectives to reteach first
                    </h3>
                    <ol className="mt-2 space-y-1.5">
                      {aggregate.hardestObjectives.slice(0, 4).map((row) => (
                        <li key={row.objective.id} className="text-[0.85rem]">
                          <span className="font-medium text-ink-800">
                            {row.objective.code}
                          </span>{" "}
                          <span className="text-ink-600">
                            {row.objective.text}
                          </span>
                          <span className="block text-[0.8rem] text-ink-400">
                            {row.studentsNeedingReview} of{" "}
                            {row.studentsWithEvidence} with evidence need review
                            {row.accuracy !== null
                              ? ` · ${percent(row.accuracy)} accuracy`
                              : ""}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                {aggregate.confusingConcepts.length > 0 ? (
                  <div className="border-t border-tan-100 pt-5">
                    <h3 className="text-sm font-semibold">
                      Most common confusion
                    </h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {aggregate.confusingConcepts.slice(0, 6).map((concept) => (
                        <li key={concept.name}>
                          <Badge tone="attention">
                            {concept.name} · {concept.count}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardBody>
            </Card>

            <StatusLegend />
          </div>

          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <nav aria-label="Filter by status">
              <ul className="flex flex-wrap items-center gap-2">
                <li>
                  <Link
                    href={filterHref(null)}
                    aria-current={statusFilter === null ? "true" : undefined}
                    className={`inline-flex rounded-full border px-3 py-1 text-[0.82rem] no-underline ${
                      statusFilter === null
                        ? "border-brand-600 bg-brand-600 font-medium text-paper-50"
                        : "border-tan-200 bg-white text-ink-600"
                    }`}
                  >
                    All ({roster.length})
                  </Link>
                </li>
                {READINESS_STATUSES.map((status) => (
                  <li key={status}>
                    <Link
                      href={filterHref(status)}
                      aria-current={statusFilter === status ? "true" : undefined}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.82rem] no-underline ${
                        statusFilter === status
                          ? "border-brand-600 bg-brand-600 font-medium text-paper-50"
                          : "border-tan-200 bg-white text-ink-600"
                      }`}
                    >
                      <span aria-hidden="true">
                        {READINESS_PRESENTATION[status].glyph}
                      </span>
                      {READINESS_PRESENTATION[status].label} (
                      {aggregate.counts[status]})
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Sort roster" className="text-[0.82rem]">
              <span className="text-ink-500">Sort: </span>
              {(Object.keys(SORTS) as (keyof typeof SORTS)[]).map((key, index) => (
                <span key={key}>
                  {index > 0 ? <span className="text-ink-300"> · </span> : null}
                  {sort === key ? (
                    <span className="font-medium text-ink-800">{SORTS[key]}</span>
                  ) : (
                    <Link href={sortHref(key)}>{SORTS[key]}</Link>
                  )}
                </span>
              ))}
            </nav>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              title="No students match this filter"
              description="Try clearing the status filter."
            />
          ) : (
            <Card>
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <caption className="sr-only">
                      Student roster with readiness status, participation, topics
                      needing attention, last activity, questions submitted and
                      support plan size.
                    </caption>
                    <thead>
                      <tr className="border-b border-tan-200 bg-paper-100 text-[0.78rem] uppercase tracking-wide text-ink-500">
                        <th scope="col" className="px-4 py-2.5 font-medium">
                          Student
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-medium">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-medium">
                          Participation
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-medium">
                          Assessment readiness
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-medium">
                          Topics needing attention
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-medium">
                          Last activity
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-medium">
                          Questions
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-medium">
                          Support plan
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-medium">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-tan-100">
                      {rows.map(({ student, result, recommendations: recs, openFollowUps }) => {
                        const participation = result.signals.find(
                          (s) => s.kind === "participation_breadth",
                        );
                        const assessment = result.signals.find(
                          (s) => s.kind === "practice_assessment",
                        );
                        const gaps = result.gaps
                          .filter((gap) => gap.standing === "needs_review")
                          .slice(0, 2);

                        return (
                          <tr key={student.id} className="align-top">
                            <th
                              scope="row"
                              className="px-4 py-3 text-left font-medium text-ink-800"
                            >
                              <Link
                                href={`/professor/courses/${courseId}/students/${student.id}`}
                              >
                                {student.name}
                              </Link>
                              {result.override ? (
                                <span className="mt-1 block text-[0.75rem] font-normal text-brand-600">
                                  Status set manually
                                </span>
                              ) : null}
                            </th>
                            <td className="px-4 py-3">
                              <StatusPill status={result.status} size="sm" />
                            </td>
                            <td className="px-4 py-3 text-ink-600">
                              {participation?.value !== null &&
                              participation?.value !== undefined
                                ? percent(participation.value)
                                : "—"}
                              <span className="block text-[0.75rem] text-ink-400">
                                of published lectures
                              </span>
                            </td>
                            <td className="px-4 py-3 text-ink-600">
                              {assessment?.value !== null &&
                              assessment?.value !== undefined
                                ? percent(assessment.value)
                                : "not attempted"}
                            </td>
                            <td className="px-4 py-3 text-ink-600">
                              {gaps.length === 0 ? (
                                <span className="text-ink-400">—</span>
                              ) : (
                                <ul>
                                  {gaps.map((gap) => (
                                    <li
                                      key={gap.objective.id}
                                      className="text-[0.82rem]"
                                    >
                                      {gap.objective.code}
                                      {gap.confusingConcepts[0]
                                        ? ` · ${gap.confusingConcepts[0]}`
                                        : ""}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                            <td className="px-4 py-3 text-[0.82rem] text-ink-500">
                              {relativeTime(student.last_activity_at)}
                            </td>
                            <td className="px-4 py-3 tabular-nums text-ink-600">
                              {student.questions_submitted}
                            </td>
                            <td className="px-4 py-3 text-ink-600">
                              {recs.length === 0 ? (
                                <span className="text-ink-400">none</span>
                              ) : (
                                <>
                                  {recs.filter((r) => r.status === "completed").length}
                                  {" / "}
                                  {recs.length} done
                                </>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/professor/courses/${courseId}/students/${student.id}`}
                                className="text-[0.82rem]"
                              >
                                {openFollowUps > 0
                                  ? `Follow up (${openFollowUps})`
                                  : "Review"}{" "}
                                →
                              </Link>
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
        </>
      )}
    </>
  );
}
