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
  Meter,
  Notice,
  SectionHeading,
} from "@/components/ui/primitives";
import { StatusPill } from "@/components/ui/status";
import {
  ASSESSMENT_TYPE_LABELS,
  HUMAN_GRADED_ASSESSMENT_TYPES,
} from "@/lib/domain/vocabulary";
import { formatDateTime, isFuture, percent } from "@/lib/format";
import {
  listAssessments,
  studentAssessmentProgress,
} from "@/lib/repositories/assessments";
import { getCourse } from "@/lib/repositories/courses";
import { readinessFor } from "@/lib/repositories/readiness";
import { currentStudentInCourse } from "@/lib/role/role-context";

export const metadata: Metadata = { title: "Assessments" };

export default async function StudentAssessmentsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  const student = await currentStudentInCourse(courseId);
  if (!course || !student) notFound();

  const readiness = readinessFor(courseId, student.studentId);
  const assessments = listAssessments(courseId, { publishedOnly: true }).map(
    (assessment) => ({
      ...assessment,
      progress: studentAssessmentProgress(student.studentId, assessment.id),
    }),
  );

  const practice = assessments.filter((a) => a.is_practice === 1);
  const graded = assessments.filter((a) => a.is_practice === 0);

  return (
    <>
      <SectionHeading
        level={1}
        title="Assessments"
        description="What is coming, and the practice sets that tell you where you stand before it arrives."
        action={<StatusPill status={readiness.status} />}
      />

      {assessments.length === 0 ? (
        <EmptyState
          title="No assessments yet"
          description="Your professor has not published any assessments for this course."
        />
      ) : (
        <div className="space-y-8">
          {practice.length > 0 ? (
            <section>
              <SectionHeading
                title="Practice"
                level={2}
                description="Not graded. Answer honestly — the point is to find the gaps while there is time."
              />
              <ul className="space-y-3">
                {practice.map((assessment) => (
                  <Card as="li" key={assessment.id}>
                    <CardBody>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="track">Practice — not graded</Badge>
                            <Badge>
                              {ASSESSMENT_TYPE_LABELS[assessment.type]}
                            </Badge>
                          </div>
                          <h3 className="mt-1.5 font-serif text-lg leading-snug">
                            <Link
                              href={`/student/${courseId}/assessments/${assessment.id}`}
                              className="no-underline hover:underline"
                            >
                              {assessment.title}
                            </Link>
                          </h3>
                          {assessment.description ? (
                            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-600">
                              {assessment.description}
                            </p>
                          ) : null}
                          {assessment.professor_guidance ? (
                            <p className="mt-2 max-w-2xl rounded border border-tan-100 bg-paper-100 px-3 py-2 text-[0.85rem] text-ink-600">
                              <span className="font-medium">
                                From {course.professor_name}:
                              </span>{" "}
                              {assessment.professor_guidance}
                            </p>
                          ) : null}
                        </div>

                        <div className="shrink-0">
                          <ButtonLink
                            href={`/student/${courseId}/assessments/${assessment.id}`}
                            size="sm"
                          >
                            {assessment.progress.answered === 0
                              ? "Start"
                              : assessment.progress.answered <
                                  assessment.progress.total
                                ? "Continue"
                                : "Review"}
                          </ButtonLink>
                        </div>
                      </div>

                      {assessment.progress.total > 0 ? (
                        <div className="mt-4 space-y-3 border-t border-tan-100 pt-3">
                          <Meter
                            label="Questions answered"
                            value={assessment.progress.answered}
                            max={assessment.progress.total}
                            valueText={`${assessment.progress.answered} of ${assessment.progress.total}`}
                            tone="brand"
                          />
                          {assessment.progress.scorable > 0 ? (
                            <Meter
                              label="Correct on auto-scored questions"
                              value={assessment.progress.correct}
                              max={assessment.progress.scorable}
                              valueText={`${assessment.progress.correct} of ${assessment.progress.scorable} (${percent(
                                assessment.progress.correct /
                                  assessment.progress.scorable,
                              )})`}
                              tone={
                                assessment.progress.correct /
                                  assessment.progress.scorable >=
                                0.75
                                  ? "track"
                                  : "attention"
                              }
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </CardBody>
                  </Card>
                ))}
              </ul>
            </section>
          ) : null}

          {graded.length > 0 ? (
            <section>
              <SectionHeading
                title="Graded work"
                level={2}
                description="Read and marked by your professor. This prototype does not score written work."
              />
              <ul className="space-y-3">
                {graded.map((assessment) => {
                  const humanGraded = HUMAN_GRADED_ASSESSMENT_TYPES.includes(
                    assessment.type,
                  );
                  return (
                    <Card as="li" key={assessment.id}>
                      <CardBody>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone="brand">
                                {ASSESSMENT_TYPE_LABELS[assessment.type]}
                              </Badge>
                              {assessment.scheduled_at &&
                              isFuture(assessment.scheduled_at) ? (
                                <Badge tone="attention">Upcoming</Badge>
                              ) : null}
                            </div>
                            <h3 className="mt-1.5 font-serif text-lg leading-snug">
                              {assessment.title}
                            </h3>
                            <p className="mt-1 text-[0.85rem] text-ink-500">
                              {assessment.scheduled_at
                                ? formatDateTime(assessment.scheduled_at)
                                : "Date not set"}
                              {assessment.weight_label
                                ? ` · ${assessment.weight_label}`
                                : ""}
                            </p>
                            {assessment.description ? (
                              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
                                {assessment.description}
                              </p>
                            ) : null}
                            {assessment.professor_guidance ? (
                              <p className="mt-2 max-w-2xl rounded border border-tan-100 bg-paper-100 px-3 py-2 text-[0.85rem] text-ink-600">
                                <span className="font-medium">
                                  From {course.professor_name}:
                                </span>{" "}
                                {assessment.professor_guidance}
                              </p>
                            ) : null}
                            {assessment.study_resources ? (
                              <p className="mt-2 text-[0.85rem] text-ink-600">
                                <span className="font-medium">
                                  Study resources:
                                </span>{" "}
                                {assessment.study_resources}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {humanGraded ? (
                          <p className="mt-3 border-t border-tan-100 pt-3 text-[0.82rem] text-ink-500">
                            Written work is read by your professor. No automated
                            score is produced or implied.
                          </p>
                        ) : null}
                      </CardBody>
                    </Card>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      {readiness.gaps.length > 0 ? (
        <Card className="mt-8">
          <CardHeader
            title="Before your next assessment"
            description="Topics with the weakest evidence in your recorded activity."
          />
          <CardBody>
            <ul className="space-y-2">
              {readiness.gaps.map((gap) => (
                <li key={gap.objective.id} className="text-sm text-ink-700">
                  {gap.objective.text}
                  {gap.confusingConcepts.length > 0 ? (
                    <span className="mt-0.5 block text-[0.8rem] text-attention-600">
                      {gap.confusingConcepts.join("; ")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-4 flex flex-wrap gap-4 text-[0.85rem]">
              <Link href={`/student/${courseId}/readiness`}>
                Full readiness detail →
              </Link>
              <Link href={`/student/${courseId}/support`}>
                Your support plan →
              </Link>
            </p>
          </CardBody>
        </Card>
      ) : null}

      <Notice tone="info" className="mt-8">
        Practice results and confidence ratings feed your readiness view. Your
        professor sees class totals for practice sets, and your individual responses
        for graded work.
      </Notice>
    </>
  );
}
