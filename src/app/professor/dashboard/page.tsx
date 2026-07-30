import type { Metadata } from "next";
import Link from "next/link";
import { ProfessorShell } from "@/components/layout/shells";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  DemoBadge,
  EmptyState,
  Meter,
  Notice,
  SectionHeading,
  Stat,
} from "@/components/ui/primitives";
import {
  StatusDistribution,
  StatusLegend,
  StatusPill,
} from "@/components/ui/status";
import {
  ASSESSMENT_TYPE_LABELS,
  DELIVERY_MODE_LABELS,
  LECTURE_STATUS_LABELS,
  QUESTION_KIND_LABELS,
} from "@/lib/domain/vocabulary";
import { attentionRank } from "@/lib/domain/readiness";
import { formatDayMonth, percent, relativeTime } from "@/lib/format";
import { listAssessments } from "@/lib/repositories/assessments";
import { listCourses } from "@/lib/repositories/courses";
import {
  listQuestions,
  listRecentActivity,
  listSegmentConfusion,
} from "@/lib/repositories/engagement";
import { listLectures } from "@/lib/repositories/lectures";
import {
  classAggregate,
  readinessForCourse,
} from "@/lib/repositories/readiness";
import { listRoster } from "@/lib/repositories/students";
import { requireProfessor } from "@/lib/role/role-context";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * How to address someone in a greeting: "Dr. Carter" rather than either the bare
 * surname or the full "Dr. Miriam Carter", which reads oddly in a salutation.
 * Falls back to the whole name when there is no recognisable title.
 */
function greetingName(fullName: string): string {
  const match = /^((?:Dr|Prof|Professor|Rev|Fr|Sr|Mr|Ms|Mrs)\.?)\s+(.+)$/i.exec(
    fullName.trim(),
  );
  if (!match) return fullName;
  const surname = match[2].trim().split(/\s+/).pop();
  return surname ? `${match[1]} ${surname}` : fullName;
}

export default async function ProfessorDashboard() {
  const { professor } = requireProfessor();
  const courses = listCourses(professor.id);

  if (courses.length === 0) {
    return (
      <ProfessorShell professorName={professor.name}>
        <SectionHeading
          level={1}
          title="Dashboard"
          description="You are not teaching any courses in this prototype yet."
        />
        <EmptyState
          title="Start with a course"
          description="Create a course to generate a student access link and QR code, then add a syllabus and your first lecture."
          action={<ButtonLink href="/professor/courses/new">Create course</ButtonLink>}
        />
      </ProfessorShell>
    );
  }

  // The dashboard focuses on the most recently created course, and lists the rest.
  const primary = courses[0];
  const roster = listRoster(primary.id);
  const readiness = readinessForCourse(
    primary.id,
    roster.map((s) => s.id),
  );
  const aggregate = classAggregate(primary.id, readiness);

  const needingAttention = roster
    .map((student) => ({
      student,
      result: readiness.find((r) => r.studentId === student.id)!.result,
    }))
    .filter((row) => row.result.status !== "on_track")
    .sort(
      (a, b) =>
        attentionRank(a.result.status) - attentionRank(b.result.status) ||
        (a.result.score ?? 1) - (b.result.score ?? 1),
    );

  const lectures = listLectures(primary.id);
  const upcomingLectures = lectures.filter(
    (lecture) =>
      lecture.status === "scheduled" ||
      lecture.status === "live" ||
      lecture.status === "draft",
  );
  const liveLecture = lectures.find((lecture) => lecture.status === "live");

  const assessments = listAssessments(primary.id).filter(
    (assessment) => assessment.is_practice === 0 && assessment.scheduled_at,
  );

  const openQuestions = listQuestions(primary.id, { status: "open", limit: 6 });
  const confusion = listSegmentConfusion(primary.id).slice(0, 5);
  const activity = listRecentActivity(primary.id, 8);

  const quickActions = [
    { href: `/professor/courses/new`, label: "Create course" },
    { href: `/professor/courses/${primary.id}/syllabus`, label: "Upload syllabus" },
    {
      href: `/professor/courses/${primary.id}/lectures/new`,
      label: "Add lecture",
    },
    {
      href: `/professor/courses/${primary.id}/assessments`,
      label: "Add assessment",
    },
    {
      href: `/professor/courses/${primary.id}/content?add=teaching_notes`,
      label: "Add teaching notes",
    },
    {
      href: `/professor/courses/${primary.id}/students`,
      label: "Review student readiness",
    },
    {
      href: `/professor/courses/${primary.id}/support`,
      label: "Create support recommendation",
    },
  ];

  return (
    <ProfessorShell professorName={professor.name}>
      <SectionHeading
        level={1}
        title={`Good to see you, ${greetingName(professor.name)}`}
        description="What needs your attention before the next class."
        action={
          liveLecture ? (
            <ButtonLink
              href={`/professor/courses/${primary.id}/lectures/${liveLecture.id}/live`}
            >
              Return to live console
            </ButtonLink>
          ) : (
            <ButtonLink href="/professor/courses/new" variant="secondary">
              Create course
            </ButtonLink>
          )
        }
      />

      <nav aria-label="Quick actions" className="mb-8">
        <ul className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <li key={action.label}>
              <Link
                href={action.href}
                className="inline-flex rounded-full border border-tan-200 bg-white px-3 py-1.5 text-[0.85rem] text-ink-700 no-underline hover:border-brand-300 hover:text-brand-700"
              >
                {action.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={`${primary.code} — ${primary.title}`}
            description={`${roster.length} students · ${primary.term ?? "term not set"}`}
            action={
              <ButtonLink
                href={`/professor/courses/${primary.id}`}
                variant="secondary"
                size="sm"
              >
                Open course
              </ButtonLink>
            }
          />
          <CardBody>
            <h3 className="mb-3 text-sm font-semibold">Class understanding</h3>
            <StatusDistribution counts={aggregate.counts} total={aggregate.total} />

            <dl className="mt-6 grid grid-cols-2 gap-5 border-t border-tan-100 pt-5 sm:grid-cols-4">
              <Stat
                label="On track"
                value={percent(aggregate.shares.on_track)}
                tone="track"
              />
              <Stat
                label="Needs review"
                value={percent(aggregate.shares.needs_review)}
                tone="attention"
              />
              <Stat
                label="Support recommended"
                value={percent(aggregate.shares.support_recommended)}
                tone="concern"
              />
              <Stat
                label="Not enough data"
                value={percent(aggregate.shares.insufficient_data)}
                tone="unknown"
              />
            </dl>

            {aggregate.averageConfidence !== null ? (
              <div className="mt-6 border-t border-tan-100 pt-5">
                <Meter
                  label="Average self-reported confidence across the class"
                  value={aggregate.averageConfidence}
                  max={5}
                  valueText={`${aggregate.averageConfidence.toFixed(1)} of 5`}
                  tone={
                    aggregate.averageConfidence >= 4
                      ? "track"
                      : aggregate.averageConfidence >= 3
                        ? "attention"
                        : "concern"
                  }
                />
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Students to follow up"
              description={
                needingAttention.length === 0
                  ? "Nobody is flagged right now."
                  : `${needingAttention.length} of ${roster.length} students`
              }
              level={3}
            />
            <CardBody className="p-0">
              {needingAttention.length === 0 ? (
                <p className="px-5 py-4 text-sm text-ink-500">
                  Every student with enough recorded activity is on track.
                </p>
              ) : (
                <ul className="divide-y divide-tan-100">
                  {needingAttention.slice(0, 6).map(({ student, result }) => (
                    <li key={student.id}>
                      <Link
                        href={`/professor/courses/${primary.id}/students/${student.id}`}
                        className="flex items-center justify-between gap-3 px-5 py-3 no-underline hover:bg-paper-100"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink-800">
                            {student.name}
                          </span>
                          <span className="block truncate text-[0.8rem] text-ink-500">
                            {result.gaps[0]
                              ? `Weakest: ${result.gaps[0].objective.code}`
                              : "No specific objective flagged"}
                            {" · "}
                            {relativeTime(student.last_activity_at)}
                          </span>
                        </span>
                        <StatusPill status={result.status} size="sm" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <StatusLegend />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Most confusing moments"
            description="Aggregated across the class. Individual students are never named here."
            level={3}
          />
          <CardBody>
            {confusion.length === 0 ? (
              <p className="text-sm text-ink-500">
                No lecture moments have been marked confusing yet.
              </p>
            ) : (
              <ol className="space-y-3">
                {confusion.map((row) => (
                  <li key={row.segment_id}>
                    <Meter
                      label={`${row.heading} — ${row.lecture_title}`}
                      value={row.confusing}
                      max={Math.max(row.confusing + row.clear, 1)}
                      valueText={`${row.confusing} confusing · ${row.clear} clear`}
                      tone={row.confusing > row.clear ? "concern" : "attention"}
                    />
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-4 text-[0.82rem] text-ink-500">
              <Link href={`/professor/courses/${primary.id}/insights`}>
                Open the comprehension dashboard →
              </Link>
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Questions awaiting a response"
            description={`${openQuestions.length} open`}
            level={3}
          />
          <CardBody className="p-0">
            {openQuestions.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-500">
                No open questions. Everything submitted has been answered or
                addressed in class.
              </p>
            ) : (
              <ul className="divide-y divide-tan-100">
                {openQuestions.map((question) => (
                  <li key={question.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">
                        {QUESTION_KIND_LABELS[question.kind]}
                      </Badge>
                      {question.votes > 0 ? (
                        <span className="text-[0.78rem] text-ink-500">
                          {question.votes} upvote{question.votes === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-sm text-ink-700">{question.body}</p>
                    <p className="mt-1 text-[0.8rem] text-ink-400">
                      {question.student_name}
                      {question.segment_heading
                        ? ` · on "${question.segment_heading}"`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="border-t border-tan-100 px-5 py-3 text-[0.82rem]">
              <Link href={`/professor/courses/${primary.id}/insights`}>
                Answer questions →
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Upcoming lectures" level={3} />
          <CardBody className="p-0">
            {upcomingLectures.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-500">
                No scheduled or draft lectures.
              </p>
            ) : (
              <ul className="divide-y divide-tan-100">
                {upcomingLectures.map((lecture) => (
                  <li key={lecture.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-ink-800">
                      {lecture.title}
                    </p>
                    <p className="mt-0.5 text-[0.8rem] text-ink-500">
                      {formatDayMonth(lecture.scheduled_at)} ·{" "}
                      {DELIVERY_MODE_LABELS[lecture.delivery_mode]} ·{" "}
                      {LECTURE_STATUS_LABELS[lecture.status]}
                    </p>
                    {lecture.status === "live" ? (
                      <p className="mt-1.5 text-[0.82rem]">
                        <Link
                          href={`/professor/courses/${primary.id}/lectures/${lecture.id}/live`}
                        >
                          Open live console →
                        </Link>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Upcoming assessments" level={3} />
          <CardBody className="p-0">
            {assessments.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-500">
                No dated assessments yet.
              </p>
            ) : (
              <ul className="divide-y divide-tan-100">
                {assessments.map((assessment) => (
                  <li key={assessment.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-ink-800">
                      {assessment.title}
                    </p>
                    <p className="mt-0.5 text-[0.8rem] text-ink-500">
                      {ASSESSMENT_TYPE_LABELS[assessment.type]} ·{" "}
                      {formatDayMonth(assessment.scheduled_at)}
                      {assessment.weight_label ? ` · ${assessment.weight_label}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent activity" level={3} />
          <CardBody className="p-0">
            <ul className="divide-y divide-tan-100">
              {activity.map((event) => (
                <li key={event.id} className="px-5 py-2.5">
                  <p className="text-[0.85rem] text-ink-700">{event.summary}</p>
                  <p className="text-[0.78rem] text-ink-400">
                    {relativeTime(event.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {courses.length > 1 ? (
        <section className="mt-10">
          <SectionHeading title="Your other courses" level={2} />
          <ul className="grid gap-4 sm:grid-cols-2">
            {courses.slice(1).map((course) => (
              <Card as="li" key={course.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold">
                        <Link href={`/professor/courses/${course.id}`}>
                          {course.code} — {course.title}
                        </Link>
                      </h3>
                      <p className="mt-1 text-[0.82rem] text-ink-500">
                        {course.student_count} students · {course.lecture_count}{" "}
                        lectures
                      </p>
                    </div>
                    {course.is_demo === 1 ? <DemoBadge /> : null}
                  </div>
                </CardBody>
              </Card>
            ))}
          </ul>
        </section>
      ) : null}

      <Notice tone="privacy" className="mt-10">
        Everything on this screen is aggregated coursework activity, questions
        students chose to submit, and notes students explicitly shared. Private
        student notes are never surfaced here or anywhere else in the professor
        portal.
      </Notice>
    </ProfessorShell>
  );
}
