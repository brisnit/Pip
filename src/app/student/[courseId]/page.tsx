import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Notice,
  SectionHeading,
  Stat,
} from "@/components/ui/primitives";
import {
  ConfidenceNote,
  StandingPill,
  StatusPill,
} from "@/components/ui/status";
import {
  ASSESSMENT_TYPE_LABELS,
  CONTENT_TYPE_LABELS,
  DELIVERY_MODE_LABELS,
  NOTE_KIND_LABELS,
  PRIORITY_LABELS,
  READINESS_PRESENTATION,
  SUPPORT_PATHWAY_LABELS,
} from "@/lib/domain/vocabulary";
import { formatDayMonth, isFuture, relativeTime } from "@/lib/format";
import {
  getPracticeAssessment,
  getUpcomingAssessment,
  studentAssessmentProgress,
} from "@/lib/repositories/assessments";
import { listMaterials } from "@/lib/repositories/content";
import { getCourse, listModules } from "@/lib/repositories/courses";
import { listNotes } from "@/lib/repositories/engagement";
import { listStudentLectures } from "@/lib/repositories/lectures";
import { readinessFor } from "@/lib/repositories/readiness";
import { listRecommendations } from "@/lib/repositories/support";
import { currentStudentInCourse } from "@/lib/role/role-context";

export const metadata: Metadata = { title: "Course home" };

export default async function StudentCourseHome({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  const student = await currentStudentInCourse(courseId);
  if (!course || !student) notFound();

  const readiness = readinessFor(courseId, student.studentId);
  const lectures = listStudentLectures(courseId);
  const modules = listModules(courseId);
  const materials = listMaterials(courseId, { studentVisibleOnly: true });
  const notes = listNotes(student.studentId, courseId).slice(0, 4);
  const recommendations = listRecommendations(courseId, {
    studentId: student.studentId,
  });

  const liveLecture = lectures.find((lecture) => lecture.status === "live");
  const nextLecture =
    liveLecture ??
    lectures.find(
      (lecture) => lecture.scheduled_at && isFuture(lecture.scheduled_at),
    ) ??
    null;
  const latestLecture = lectures[lectures.length - 1] ?? null;

  const currentModule =
    modules.find((module) => module.id === latestLecture?.module_id) ??
    modules[0] ??
    null;

  const upcomingAssessment = getUpcomingAssessment(courseId);
  const practice = getPracticeAssessment(courseId);
  const practiceProgress = practice
    ? studentAssessmentProgress(student.studentId, practice.id)
    : null;

  const openRecommendations = recommendations.filter(
    (rec) => rec.status !== "completed" && rec.status !== "declined",
  );
  const topRecommendation = openRecommendations[0] ?? null;

  const recentMaterials = materials.slice(-4).reverse();

  // The single most useful next action, chosen from what is actually true.
  const nextAction = liveLecture
    ? {
        label: "Join the live lecture",
        href: `/student/${courseId}/lecture/${liveLecture.id}`,
        why: `${liveLecture.title} is live now.`,
      }
    : readiness.status === "insufficient_data" && latestLecture
      ? {
          label: `Open ${latestLecture.title}`,
          href: `/student/${courseId}/lecture/${latestLecture.id}`,
          why: "There isn't enough recorded activity yet to tell you where you stand. Working through one lecture changes that.",
        }
      : topRecommendation
        ? {
            label: "Open your support plan",
            href: `/student/${courseId}/support`,
            why: topRecommendation.title,
          }
        : practice && practiceProgress && practiceProgress.answered < practiceProgress.total
          ? {
              label: `Continue ${practice.title}`,
              href: `/student/${courseId}/assessments/${practice.id}`,
              why: `${practiceProgress.answered} of ${practiceProgress.total} questions answered.`,
            }
          : latestLecture
            ? {
                label: `Review ${latestLecture.title}`,
                href: `/student/${courseId}/lecture/${latestLecture.id}`,
                why: "Nothing outstanding — this keeps the material fresh.",
              }
            : null;

  return (
    <>
      <SectionHeading
        level={1}
        title={course.title}
        description={`${course.professor_name}${course.term ? ` · ${course.term}` : ""}`}
        action={<StatusPill status={readiness.status} />}
      />

      {liveLecture ? (
        <Notice tone="caution" title="Your professor is teaching right now" className="mb-6">
          <p>
            {liveLecture.title}
            {liveLecture.current_topic
              ? ` — currently on "${liveLecture.current_topic}"`
              : ""}
            .
          </p>
          <p className="mt-2">
            <ButtonLink
              href={`/student/${courseId}/lecture/${liveLecture.id}`}
              size="sm"
            >
              Join the live lecture
            </ButtonLink>
          </p>
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {nextAction ? (
            <Card>
              <CardHeader
                title="Recommended next action"
                description="Chosen from your recorded activity, not from a generic checklist."
              />
              <CardBody>
                <p className="text-sm text-ink-600">{nextAction.why}</p>
                <p className="mt-4">
                  <ButtonLink href={nextAction.href}>{nextAction.label}</ButtonLink>
                </p>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Where you stand"
              description={READINESS_PRESENTATION[readiness.status].studentSentence}
              action={
                <Link
                  href={`/student/${courseId}/readiness`}
                  className="text-[0.85rem]"
                >
                  Full detail →
                </Link>
              }
            />
            <CardBody className="space-y-5">
              <ConfidenceNote confidence={readiness.confidence} />

              {readiness.strengths.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold">
                    You appear comfortable with
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {readiness.strengths.map((row) => (
                      <li
                        key={row.objective.id}
                        className="flex flex-wrap items-baseline gap-2 text-sm"
                      >
                        <span className="text-ink-700">{row.objective.text}</span>
                        <StandingPill standing={row.standing} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {readiness.gaps.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold">
                    Topics worth another pass
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {readiness.gaps.map((row) => (
                      <li key={row.objective.id} className="text-sm">
                        <span className="flex flex-wrap items-baseline gap-2">
                          <span className="text-ink-700">
                            {row.objective.text}
                          </span>
                          <StandingPill standing={row.standing} />
                        </span>
                        {row.confusingConcepts.length > 0 ? (
                          <span className="mt-0.5 block text-[0.8rem] text-ink-500">
                            You marked confusing:{" "}
                            {row.confusingConcepts.join("; ")}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {readiness.strengths.length === 0 &&
              readiness.gaps.length === 0 ? (
                <p className="text-sm text-ink-500">
                  Nothing to report yet — work through a lecture and answer a few
                  comprehension checks, and this fills in.
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Lectures"
              description={`${lectures.length} published${currentModule ? ` · currently in ${currentModule.title}` : ""}`}
            />
            <CardBody className="p-0">
              {lectures.length === 0 ? (
                <p className="px-5 py-4 text-sm text-ink-500">
                  Your professor has not published any lectures yet.
                </p>
              ) : (
                <ul className="divide-y divide-sand-100">
                  {lectures.map((lecture) => (
                    <li key={lecture.id}>
                      <Link
                        href={`/student/${courseId}/lecture/${lecture.id}`}
                        className="block px-5 py-3 no-underline hover:bg-cream-100"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {lecture.status === "live" ? (
                            <Badge tone="concern">Live now</Badge>
                          ) : null}
                          <span className="text-sm font-medium text-ink-800">
                            {lecture.title}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[0.8rem] text-ink-500">
                          {DELIVERY_MODE_LABELS[lecture.delivery_mode]}
                          {lecture.module_title ? ` · ${lecture.module_title}` : ""}
                          {lecture.scheduled_at
                            ? ` · ${formatDayMonth(lecture.scheduled_at)}`
                            : ""}
                          {lecture.segment_count > 0
                            ? ` · ${lecture.segment_count} sections`
                            : ""}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Course progress" level={3} />
            <CardBody>
              <dl className="grid grid-cols-2 gap-4">
                <Stat
                  label="Lectures worked in"
                  value={`${
                    readiness.signals.find(
                      (s) => s.kind === "participation_breadth",
                    )?.evidence ?? 0
                  } / ${lectures.length}`}
                />
                <Stat
                  label="Checks answered"
                  value={`${
                    readiness.signals.find(
                      (s) => s.kind === "comprehension_checks",
                    )?.evidence ?? 0
                  }`}
                />
                <Stat label="Your notes" value={notes.length > 0 ? notes.length : 0} />
                <Stat
                  label="Support steps open"
                  value={openRecommendations.length}
                  tone={openRecommendations.length > 0 ? "attention" : "neutral"}
                />
              </dl>
            </CardBody>
          </Card>

          {nextLecture ? (
            <Card>
              <CardHeader title="Next lecture" level={3} />
              <CardBody>
                <p className="text-sm font-medium text-ink-800">
                  {nextLecture.title}
                </p>
                <p className="mt-1 text-[0.82rem] text-ink-500">
                  {formatDayMonth(nextLecture.scheduled_at)} ·{" "}
                  {DELIVERY_MODE_LABELS[nextLecture.delivery_mode]}
                </p>
                <p className="mt-3">
                  <ButtonLink
                    href={`/student/${courseId}/lecture/${nextLecture.id}`}
                    variant="secondary"
                    size="sm"
                  >
                    {nextLecture.status === "live"
                      ? "Join live lecture"
                      : "Open lecture"}
                  </ButtonLink>
                </p>
              </CardBody>
            </Card>
          ) : null}

          {upcomingAssessment ? (
            <Card>
              <CardHeader title="Upcoming assessment" level={3} />
              <CardBody>
                <p className="text-sm font-medium text-ink-800">
                  {upcomingAssessment.title}
                </p>
                <p className="mt-1 text-[0.82rem] text-ink-500">
                  {ASSESSMENT_TYPE_LABELS[upcomingAssessment.type]} ·{" "}
                  {formatDayMonth(upcomingAssessment.scheduled_at)}
                  {upcomingAssessment.weight_label
                    ? ` · ${upcomingAssessment.weight_label}`
                    : ""}
                </p>
                <p className="mt-3">
                  <ButtonLink
                    href={`/student/${courseId}/assessments`}
                    variant="secondary"
                    size="sm"
                  >
                    Check your readiness
                  </ButtonLink>
                </p>
              </CardBody>
            </Card>
          ) : null}

          {topRecommendation ? (
            <Card>
              <CardHeader title="Support" level={3} />
              <CardBody>
                <Badge tone="burgundy">
                  {SUPPORT_PATHWAY_LABELS[topRecommendation.pathway]}
                </Badge>
                <p className="mt-2 text-sm font-medium text-ink-800">
                  {topRecommendation.title}
                </p>
                <p className="mt-1 text-[0.82rem] text-ink-500">
                  {PRIORITY_LABELS[topRecommendation.priority]}
                </p>
                <p className="mt-3">
                  <ButtonLink
                    href={`/student/${courseId}/support`}
                    variant="secondary"
                    size="sm"
                  >
                    Open support plan
                  </ButtonLink>
                </p>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Recent materials"
              level={3}
              action={
                <Link
                  href={`/student/${courseId}/resources`}
                  className="text-[0.82rem]"
                >
                  All →
                </Link>
              }
            />
            <CardBody className="p-0">
              {recentMaterials.length === 0 ? (
                <p className="px-5 py-4 text-sm text-ink-500">
                  No materials published yet.
                </p>
              ) : (
                <ul className="divide-y divide-sand-100">
                  {recentMaterials.map((material) => (
                    <li key={material.id} className="px-5 py-2.5">
                      <p className="text-[0.85rem] text-ink-700">
                        {material.title}
                      </p>
                      <p className="text-[0.78rem] text-ink-400">
                        {CONTENT_TYPE_LABELS[material.content_type]}
                        {material.date_label ? ` · ${material.date_label}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Your recent notes"
              level={3}
              action={
                <Link
                  href={`/student/${courseId}/notes`}
                  className="text-[0.82rem]"
                >
                  All →
                </Link>
              }
            />
            <CardBody className="p-0">
              {notes.length === 0 ? (
                <div className="px-5 py-4">
                  <EmptyState
                    title="No notes yet"
                    description="Notes you take inside a lecture keep the timestamp and the transcript excerpt with them, so you never have to reconstruct what you were reacting to."
                    className="border-0 bg-transparent px-0 py-0 text-left"
                  />
                </div>
              ) : (
                <ul className="divide-y divide-sand-100">
                  {notes.map((note) => (
                    <li key={note.id} className="px-5 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{NOTE_KIND_LABELS[note.kind]}</Badge>
                        {note.shared_with_professor === 1 ? (
                          <Badge tone="gold">Shared</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[0.85rem] text-ink-600">
                        {note.title ?? note.body}
                      </p>
                      <p className="text-[0.78rem] text-ink-400">
                        {relativeTime(note.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Notice tone="privacy" className="mt-8">
        Your notes are private by default. Your professor sees aggregated
        comprehension data, questions you submit, notes you explicitly share, your
        assessment responses, and support you request — nothing else.
      </Notice>
    </>
  );
}
