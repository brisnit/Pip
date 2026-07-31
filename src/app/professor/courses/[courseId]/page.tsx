import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseAccessPanel } from "@/components/course/course-access";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  DemoBadge,
  DetailList,
  EmptyState,
  Notice,
  SectionHeading,
  Stat,
} from "@/components/ui/primitives";
import { StatusDistribution, StatusPill } from "@/components/ui/status";
import {
  ASSESSMENT_TYPE_LABELS,
  COURSE_FORMAT_LABELS,
  DELIVERY_MODE_LABELS,
  LECTURE_STATUS_LABELS,
  QUESTION_KIND_LABELS,
} from "@/lib/domain/vocabulary";
import { attentionRank } from "@/lib/domain/readiness";
import { formatDate, formatDayMonth, percent, relativeTime } from "@/lib/format";
import { listAssessments } from "@/lib/repositories/assessments";
import { listQuestions, listRecentActivity } from "@/lib/repositories/engagement";
import { getSyllabus, listMaterials } from "@/lib/repositories/content";
import {
  getCourse,
  listModules,
  listObjectives,
} from "@/lib/repositories/courses";
import { listLectures } from "@/lib/repositories/lectures";
import {
  classAggregate,
  readinessForCourse,
} from "@/lib/repositories/readiness";
import { listRoster } from "@/lib/repositories/students";
import { RotateCodeForm } from "./rotate-code";

type Props = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ created?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId } = await params;
  const course = getCourse(courseId);
  return { title: course ? `${course.code} overview` : "Course" };
}

export default async function CourseOverviewPage({
  params,
  searchParams,
}: Props) {
  const { courseId } = await params;
  const { created } = await searchParams;
  const course = getCourse(courseId);
  if (!course) notFound();

  const modules = listModules(courseId);
  const objectives = listObjectives(courseId);
  const lectures = listLectures(courseId);
  const materials = listMaterials(courseId);
  const assessments = listAssessments(courseId);
  const syllabus = getSyllabus(courseId);
  const roster = listRoster(courseId);

  const readiness = readinessForCourse(
    courseId,
    roster.map((s) => s.id),
  );
  const aggregate = classAggregate(courseId, readiness);

  // Worst first, so the person most in need of a conversation is at the top.
  // Students without enough evidence are included deliberately: "we do not know"
  // is itself a reason to follow up, and dropping them would hide them.
  const byStudent = new Map(readiness.map((row) => [row.studentId, row.result]));
  const needingAttention = roster
    .map((student) => ({ student, result: byStudent.get(student.id) }))
    .filter((row) => row.result !== undefined && row.result.status !== "on_track")
    .map((row) => ({ student: row.student, result: row.result! }))
    .sort(
      (a, b) =>
        attentionRank(a.result.status) - attentionRank(b.result.status) ||
        (a.result.score ?? 1) - (b.result.score ?? 1),
    );

  const upcomingLectures = lectures.filter(
    (lecture) =>
      lecture.status === "scheduled" ||
      lecture.status === "live" ||
      lecture.status === "draft",
  );

  // Practice assessments are self-serve and undated, so they are not "upcoming".
  const upcomingAssessments = assessments.filter(
    (assessment) => assessment.is_practice === 0 && assessment.scheduled_at,
  );

  const openQuestions = listQuestions(courseId, { status: "open", limit: 6 });
  const activity = listRecentActivity(courseId, 8);

  const setupSteps = [
    {
      label: "Syllabus added",
      done: Boolean(syllabus),
      href: `/professor/courses/${courseId}/syllabus`,
      cta: "Add syllabus",
    },
    {
      label: "Learning objectives defined",
      done: objectives.length > 0,
      href: `/professor/courses/${courseId}/syllabus`,
      cta: "Add objectives",
      detail: `${objectives.length} defined`,
    },
    {
      label: "At least one lecture published",
      done: lectures.some((lecture) => lecture.status !== "draft"),
      href: `/professor/courses/${courseId}/lectures/new`,
      cta: "Add lecture",
      detail: `${lectures.length} total`,
    },
    {
      label: "Comprehension questions attached",
      done: lectures.some((lecture) => lecture.interaction_count > 0),
      href: `/professor/courses/${courseId}/lectures/new`,
      cta: "Add questions",
    },
    {
      label: "Students joined",
      done: roster.length > 0,
      href: `/professor/courses/${courseId}/students`,
      cta: "Share the code",
      detail: `${roster.length} joined`,
    },
  ];

  const outstanding = setupSteps.filter((step) => !step.done);

  return (
    <>
      {created ? (
        <Notice tone="info" title="Course created" className="mb-6">
          Share the code or QR code below with your students, then add a syllabus
          and your first lecture.
        </Notice>
      ) : null}

      <SectionHeading
        level={1}
        title={course.title}
        description={course.description ?? undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink
              href={`/professor/courses/${courseId}/lectures/new`}
              size="sm"
            >
              Add lecture
            </ButtonLink>
            <ButtonLink
              href={`/professor/courses/${courseId}/support`}
              variant="secondary"
              size="sm"
            >
              Create support recommendation
            </ButtonLink>
            <ButtonLink
              href={`/professor/courses/${courseId}/syllabus`}
              variant="secondary"
              size="sm"
            >
              Syllabus
            </ButtonLink>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{course.code}</Badge>
        <Badge>{COURSE_FORMAT_LABELS[course.format]}</Badge>
        {course.term ? <Badge>{course.term}</Badge> : null}
        {course.is_demo === 1 ? <DemoBadge /> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Student access"
            description="Display the QR code in class, or read the code aloud."
          />
          <CardBody className="space-y-6">
            {course.access_code ? (
              <CourseAccessPanel
                accessCode={course.access_code}
                courseId={courseId}
              />
            ) : (
              <EmptyState
                title="No active access code"
                description="Issue a code so students can join this course."
              />
            )}
            <div className="border-t border-tan-100 pt-5">
              <RotateCodeForm courseId={courseId} />
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Course details" level={3} />
            <CardBody>
              <DetailList
                className="sm:grid-cols-1"
                items={[
                  { label: "Professor", value: course.professor_name },
                  {
                    label: "Meets",
                    value: [course.meeting_days, course.meeting_time]
                      .filter(Boolean)
                      .join(", "),
                  },
                  { label: "Location", value: course.location },
                  {
                    label: "Dates",
                    value:
                      course.start_date || course.end_date
                        ? `${formatDate(course.start_date)} – ${formatDate(course.end_date)}`
                        : null,
                  },
                  {
                    label: "Estimated enrolment",
                    value: course.estimated_enrollment
                      ? String(course.estimated_enrollment)
                      : null,
                  },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="At a glance" level={3} />
            <CardBody>
              <dl className="grid grid-cols-2 gap-4">
                <Stat label="Students" value={roster.length} />
                <Stat label="Modules" value={modules.length} />
                <Stat label="Objectives" value={objectives.length} />
                <Stat label="Lectures" value={lectures.length} />
                <Stat label="Materials" value={materials.length} />
                <Stat label="Assessments" value={assessments.length} />
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>

      {outstanding.length > 0 ? (
        <Card className="mt-6">
          <CardHeader
            title="Course setup"
            description={`${setupSteps.length - outstanding.length} of ${setupSteps.length} steps complete.`}
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-tan-100">
              {setupSteps.map((step) => (
                <li
                  key={step.label}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className={
                        step.done
                          ? "text-track-500"
                          : "text-unknown-500"
                      }
                    >
                      {step.done ? "✓" : "○"}
                    </span>
                    <span className="min-w-0">
                      <span className="text-sm text-ink-800">{step.label}</span>
                      <span className="sr-only">
                        {step.done ? " — complete" : " — not done yet"}
                      </span>
                      {step.detail ? (
                        <span className="ml-2 text-[0.8rem] text-ink-400">
                          {step.detail}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  {step.done ? null : (
                    <Link href={step.href} className="shrink-0 text-[0.85rem]">
                      {step.cta} →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Class understanding"
            description="Aggregated from recorded coursework activity."
            action={
              <Link
                href={`/professor/courses/${courseId}/insights`}
                className="text-[0.85rem]"
              >
                Details →
              </Link>
            }
          />
          <CardBody>
            <StatusDistribution counts={aggregate.counts} total={aggregate.total} />
            {aggregate.hardestObjectives.length > 0 ? (
              <div className="mt-6 border-t border-tan-100 pt-5">
                <h3 className="text-sm font-semibold">
                  Objectives with the weakest evidence
                </h3>
                <ol className="mt-2 space-y-2">
                  {aggregate.hardestObjectives.slice(0, 3).map((row) => (
                    <li key={row.objective.id} className="text-sm">
                      <span className="font-medium text-ink-800">
                        {row.objective.code}
                      </span>{" "}
                      <span className="text-ink-600">{row.objective.text}</span>
                      <span className="block text-[0.8rem] text-ink-400">
                        {row.studentsNeedingReview} of {row.studentsWithEvidence}{" "}
                        students with evidence need review
                        {row.accuracy !== null
                          ? ` · ${percent(row.accuracy)} of related answers correct`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Modules"
            description={`${modules.length} in teaching order`}
          />
          <CardBody className="p-0">
            {modules.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-500">
                No modules yet. Add them directly, or publish them from the
                syllabus.
              </p>
            ) : (
              <ol className="divide-y divide-tan-100">
                {modules.map((module) => {
                  const moduleLectures = lectures.filter(
                    (lecture) => lecture.module_id === module.id,
                  );
                  return (
                    <li key={module.id} className="px-5 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-medium text-ink-800">
                          {module.position}. {module.title}
                        </p>
                        {module.week_label ? (
                          <span className="shrink-0 text-[0.78rem] text-ink-400">
                            {module.week_label}
                          </span>
                        ) : null}
                      </div>
                      {module.description ? (
                        <p className="mt-1 text-[0.82rem] leading-snug text-ink-500">
                          {module.description}
                        </p>
                      ) : null}
                      {moduleLectures.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {moduleLectures.map((lecture) => (
                            <li key={lecture.id} className="text-[0.82rem] text-ink-500">
                              <Link
                                href={`/professor/courses/${courseId}/content?lecture=${lecture.id}`}
                              >
                                {lecture.title}
                              </Link>
                              {" — "}
                              {LECTURE_STATUS_LABELS[lecture.status]},{" "}
                              {DELIVERY_MODE_LABELS[lecture.delivery_mode]}
                              {lecture.scheduled_at
                                ? `, ${formatDayMonth(lecture.scheduled_at)}`
                                : ""}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>

      {/*
        Who needs a conversation, and what is waiting on the professor.

        These lived on the professor dashboard until the dashboard became a
        faculty-wide launchpad. They are course-scoped questions — "which of *my
        CH504 students* is struggling", "which questions in *this course* are
        unanswered" — so this is where they belong. The dashboard now routes here.
      */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Students to follow up"
            description={
              needingAttention.length === 0
                ? "Nobody is flagged right now."
                : `${needingAttention.length} of ${roster.length} students`
            }
            action={
              <Link
                href={`/professor/courses/${courseId}/students`}
                className="text-[0.85rem]"
              >
                Whole roster →
              </Link>
            }
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
                      href={`/professor/courses/${courseId}/students/${student.id}`}
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

        <Card>
          <CardHeader
            title="Questions awaiting a response"
            description={`${openQuestions.length} open`}
            action={
              <Link
                href={`/professor/courses/${courseId}/insights`}
                className="text-[0.85rem]"
              >
                Answer questions →
              </Link>
            }
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
                          {question.votes} upvote
                          {question.votes === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-sm text-ink-700">
                      {question.body}
                    </p>
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
                          href={`/professor/courses/${courseId}/lectures/${lecture.id}/live`}
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
            {upcomingAssessments.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-500">
                No dated assessments yet.
              </p>
            ) : (
              <ul className="divide-y divide-tan-100">
                {upcomingAssessments.map((assessment) => (
                  <li key={assessment.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-ink-800">
                      {assessment.title}
                    </p>
                    <p className="mt-0.5 text-[0.8rem] text-ink-500">
                      {ASSESSMENT_TYPE_LABELS[assessment.type]} ·{" "}
                      {formatDayMonth(assessment.scheduled_at)}
                      {assessment.weight_label
                        ? ` · ${assessment.weight_label}`
                        : ""}
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
            {activity.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-500">
                Nothing recorded in this course yet.
              </p>
            ) : (
              <ul className="divide-y divide-tan-100">
                {activity.map((event) => (
                  <li key={event.id} className="px-5 py-2.5">
                    <p className="text-[0.85rem] text-ink-700">
                      {event.summary}
                    </p>
                    <p className="text-[0.78rem] text-ink-400">
                      {relativeTime(event.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Learning objectives"
          description="Everything readiness is measured against."
        />
        <CardBody>
          {objectives.length === 0 ? (
            <p className="text-sm text-ink-500">
              No objectives defined. Readiness cannot be estimated per objective
              until at least one exists.
            </p>
          ) : (
            <ul className="space-y-2">
              {objectives.map((objective) => (
                <li key={objective.id} className="flex gap-3 text-sm">
                  <span className="shrink-0 font-medium text-brand-600">
                    {objective.code}
                  </span>
                  <span className="text-ink-700">{objective.text}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
