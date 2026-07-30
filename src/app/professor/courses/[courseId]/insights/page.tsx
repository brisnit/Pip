import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setQuestionStatusAction } from "@/app/professor/actions";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Meter,
  Notice,
  SectionHeading,
  Stat,
} from "@/components/ui/primitives";
import { StatusDistribution, StatusPill } from "@/components/ui/status";
import {
  QUESTION_KIND_LABELS,
  QUESTION_STATUS_LABELS,
  READINESS_PRESENTATION,
} from "@/lib/domain/vocabulary";
import { formatClock } from "@/lib/domain/support";
import { formatDate, percent, relativeTime } from "@/lib/format";
import { assessmentResults, listAssessments } from "@/lib/repositories/assessments";
import { getCourse } from "@/lib/repositories/courses";
import {
  listQuestions,
  listSegmentConfusion,
} from "@/lib/repositories/engagement";
import { listStudentLectures, tallyInteractions } from "@/lib/repositories/lectures";
import {
  classAggregate,
  courseTrend,
  readinessForCourse,
} from "@/lib/repositories/readiness";
import { listRoster } from "@/lib/repositories/students";
import { AnswerQuestionForm } from "../lectures/[lectureId]/live/console-forms";

export const metadata: Metadata = { title: "Comprehension" };

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  if (!course) notFound();

  const roster = listRoster(courseId);
  const readiness = readinessForCourse(
    courseId,
    roster.map((s) => s.id),
  );
  const aggregate = classAggregate(courseId, readiness);
  const trend = courseTrend(courseId);

  const lectures = listStudentLectures(courseId);
  const confusion = listSegmentConfusion(courseId);
  const openQuestions = listQuestions(courseId, { status: "open" });
  const answeredQuestions = listQuestions(courseId, { status: "answered" });

  const checkTallies = lectures.flatMap((lecture) =>
    tallyInteractions(lecture.id)
      .filter(
        (tally) =>
          tally.type === "comprehension_question" && tally.responses > 0,
      )
      .map((tally) => ({ ...tally, lectureTitle: lecture.title })),
  );

  const weakestChecks = checkTallies
    .slice()
    .sort(
      (a, b) =>
        (a.correct ?? 0) / Math.max(a.responses, 1) -
        (b.correct ?? 0) / Math.max(b.responses, 1),
    );

  const practiceAssessments = listAssessments(courseId).filter(
    (assessment) => assessment.response_count > 0,
  );

  const reteachList = aggregate.hardestObjectives.filter(
    (row) => row.studentsNeedingReview > 0,
  );

  return (
    <>
      <SectionHeading
        level={1}
        title="Comprehension dashboard"
        description="Class-level patterns. Nothing here identifies which student marked what — individual detail lives on the roster."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Where the class stands"
            description={`${roster.length} students`}
          />
          <CardBody className="space-y-6">
            <StatusDistribution counts={aggregate.counts} total={aggregate.total} />

            {trend.length > 1 ? (
              <div className="border-t border-tan-100 pt-5">
                <h3 className="text-sm font-semibold">
                  Status over time
                </h3>
                <p className="mt-1 text-[0.82rem] text-ink-500">
                  Recorded readiness snapshots only — each column is a day on
                  which at least one student&rsquo;s status was recomputed. No
                  values are interpolated or invented.
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-[0.82rem]">
                    <caption className="sr-only">
                      Number of students in each readiness band, per recorded day
                    </caption>
                    <thead>
                      <tr className="border-b border-tan-200 text-ink-500">
                        <th scope="col" className="py-1.5 pr-4 font-medium">
                          Date
                        </th>
                        <th scope="col" className="py-1.5 pr-4 font-medium">
                          On track
                        </th>
                        <th scope="col" className="py-1.5 pr-4 font-medium">
                          Needs review
                        </th>
                        <th scope="col" className="py-1.5 pr-4 font-medium">
                          Support recommended
                        </th>
                        <th scope="col" className="py-1.5 font-medium">
                          Not enough data
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-tan-100">
                      {trend.map((point) => (
                        <tr key={point.date}>
                          <th scope="row" className="py-1.5 pr-4 text-left font-normal text-ink-600">
                            {formatDate(point.date)}
                          </th>
                          <td className="py-1.5 pr-4 tabular-nums text-track-600">
                            {point.on_track}
                          </td>
                          <td className="py-1.5 pr-4 tabular-nums text-attention-600">
                            {point.needs_review}
                          </td>
                          <td className="py-1.5 pr-4 tabular-nums text-concern-600">
                            {point.support_recommended}
                          </td>
                          <td className="py-1.5 tabular-nums text-unknown-600">
                            {point.insufficient_data}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="border-t border-tan-100 pt-5">
                <h3 className="text-sm font-semibold">Status over time</h3>
                <p className="mt-1 text-sm text-ink-500">
                  Not enough recorded history for a trend yet. Snapshots are
                  written only when a student&rsquo;s status or score actually
                  changes, so a trend appears once the class has worked through
                  more material. No values are interpolated or invented to fill
                  the gap.
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="At a glance" level={3} />
            <CardBody>
              <dl className="grid grid-cols-2 gap-4">
                <Stat
                  label="Average confidence"
                  value={
                    aggregate.averageConfidence !== null
                      ? `${aggregate.averageConfidence.toFixed(1)} / 5`
                      : "—"
                  }
                  tone={
                    aggregate.averageConfidence === null
                      ? "unknown"
                      : aggregate.averageConfidence >= 4
                        ? "track"
                        : aggregate.averageConfidence >= 3
                          ? "attention"
                          : "concern"
                  }
                />
                <Stat
                  label="Open questions"
                  value={openQuestions.length}
                  tone={openQuestions.length > 0 ? "attention" : "neutral"}
                />
                <Stat
                  label="Confusing moments"
                  value={confusion.length}
                />
                <Stat
                  label="Without enough data"
                  value={aggregate.studentsWithoutEnoughData}
                  tone="unknown"
                />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Reteach next"
              description="Objectives with the weakest evidence across the class."
              level={3}
            />
            <CardBody>
              {reteachList.length === 0 ? (
                <p className="text-sm text-ink-500">
                  No objective is showing widespread weakness.
                </p>
              ) : (
                <ol className="space-y-3">
                  {reteachList.slice(0, 5).map((row) => (
                    <li key={row.objective.id}>
                      <Meter
                        label={`${row.objective.code} — ${row.objective.text}`}
                        value={row.studentsNeedingReview}
                        max={Math.max(row.studentsWithEvidence, 1)}
                        valueText={`${row.studentsNeedingReview} of ${row.studentsWithEvidence} need review`}
                        tone={
                          row.studentsNeedingReview / row.studentsWithEvidence >
                          0.4
                            ? "concern"
                            : "attention"
                        }
                      />
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Hardest comprehension checks"
            description="Lowest accuracy first. Answer distributions show which distractor is winning."
          />
          <CardBody className="space-y-5">
            {weakestChecks.length === 0 ? (
              <p className="text-sm text-ink-500">
                No comprehension answers recorded yet.
              </p>
            ) : (
              weakestChecks.slice(0, 5).map((tally) => {
                const accuracy = (tally.correct ?? 0) / Math.max(tally.responses, 1);
                return (
                  <div key={tally.interactionId}>
                    <Meter
                      label={tally.prompt}
                      value={accuracy}
                      valueText={`${tally.correct} of ${tally.responses} correct (${percent(accuracy)})`}
                      tone={
                        accuracy >= 0.75
                          ? "track"
                          : accuracy >= 0.5
                            ? "attention"
                            : "concern"
                      }
                    />
                    <p className="mt-1 text-[0.78rem] text-ink-400">
                      {tally.lectureTitle}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {tally.options.map((option) => (
                        <li
                          key={option.id}
                          className="flex items-baseline justify-between gap-3 text-[0.82rem]"
                        >
                          <span className="min-w-0 text-ink-600">
                            <span
                              aria-hidden="true"
                              className={
                                option.isCorrect
                                  ? "mr-1.5 text-track-500"
                                  : "mr-1.5 text-ink-300"
                              }
                            >
                              {option.isCorrect ? "✓" : "·"}
                            </span>
                            {option.text}
                            {option.isCorrect ? (
                              <span className="sr-only"> (correct answer)</span>
                            ) : null}
                          </span>
                          <span className="shrink-0 tabular-nums text-ink-500">
                            {option.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Most confusing moments"
              description="Segments students marked confusing, across every lecture."
            />
            <CardBody>
              {confusion.length === 0 ? (
                <p className="text-sm text-ink-500">
                  Nothing has been marked confusing.
                </p>
              ) : (
                <ol className="space-y-3">
                  {confusion.slice(0, 8).map((row) => (
                    <li key={row.segment_id}>
                      <Meter
                        label={row.heading}
                        value={row.confusing}
                        max={Math.max(row.confusing + row.clear, 1)}
                        valueText={`${row.confusing} confusing · ${row.clear} clear · ${row.distinct_students} student${
                          row.distinct_students === 1 ? "" : "s"
                        }`}
                        tone={row.confusing > row.clear ? "concern" : "attention"}
                      />
                      <p className="mt-1 text-[0.78rem] text-ink-400">
                        {row.lecture_title}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>

          {practiceAssessments.length > 0 ? (
            <Card>
              <CardHeader
                title="Assessment results"
                description="Auto-scored questions only. Written responses are read by you."
              />
              <CardBody className="space-y-5">
                {practiceAssessments.map((assessment) => {
                  const results = assessmentResults(assessment.id);
                  const scorable = results.filter((r) => r.autoScored);
                  return (
                    <div key={assessment.id}>
                      <h3 className="text-sm font-semibold">
                        <Link
                          href={`/professor/courses/${courseId}/assessments`}
                        >
                          {assessment.title}
                        </Link>
                      </h3>
                      <p className="mt-0.5 text-[0.8rem] text-ink-400">
                        {assessment.response_count} student
                        {assessment.response_count === 1 ? "" : "s"} responded
                      </p>
                      <ul className="mt-2 space-y-2">
                        {scorable.map((question) => (
                          <li key={question.questionId}>
                            <Meter
                              label={question.prompt}
                              value={question.correct}
                              max={Math.max(question.responses, 1)}
                              valueText={`${question.correct} of ${question.responses} correct`}
                              tone={
                                question.correct / Math.max(question.responses, 1) >=
                                0.75
                                  ? "track"
                                  : question.correct /
                                        Math.max(question.responses, 1) >=
                                      0.5
                                    ? "attention"
                                    : "concern"
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>

      <section className="mt-8">
        <SectionHeading
          title="Questions"
          description="Everything students chose to submit, most upvoted first."
        />

        {openQuestions.length === 0 && answeredQuestions.length === 0 ? (
          <EmptyState
            title="No questions yet"
            description="Students can ask a question from any point in a lecture. Questions carry the segment and transcript excerpt with them, so you can see exactly what prompted them."
          />
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Awaiting a response"
                description={`${openQuestions.length} open`}
              />
              <CardBody className="p-0">
                {openQuestions.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-ink-500">
                    Nothing outstanding.
                  </p>
                ) : (
                  <ul className="divide-y divide-tan-100">
                    {openQuestions.map((question) => (
                      <li key={question.id} className="px-5 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
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
                              {question.at_seconds !== null ? (
                                <span className="font-mono text-[0.78rem] text-ink-400">
                                  {formatClock(question.at_seconds)}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm text-ink-800">
                              {question.body}
                            </p>
                            <p className="mt-1 text-[0.8rem] text-ink-400">
                              {question.anonymous === 1
                                ? "Anonymous"
                                : question.student_name}
                              {question.lecture_title
                                ? ` · ${question.lecture_title}`
                                : ""}
                              {question.segment_heading
                                ? ` · "${question.segment_heading}"`
                                : ""}
                              {" · "}
                              {relativeTime(question.created_at)}
                            </p>
                            {question.transcript_excerpt ? (
                              <blockquote className="mt-2 border-l-2 border-accent-300 pl-3 text-[0.82rem] italic text-ink-500">
                                {question.transcript_excerpt}
                              </blockquote>
                            ) : null}
                            <AnswerQuestionForm
                              courseId={courseId}
                              questionId={question.id}
                            />
                          </div>
                          <form
                            action={setQuestionStatusAction}
                            className="shrink-0"
                          >
                            <input
                              type="hidden"
                              name="courseId"
                              value={courseId}
                            />
                            <input
                              type="hidden"
                              name="questionId"
                              value={question.id}
                            />
                            <input
                              type="hidden"
                              name="status"
                              value="addressed"
                            />
                            <Button type="submit" variant="secondary" size="sm">
                              Addressed in class
                            </Button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            {answeredQuestions.length > 0 ? (
              <Card>
                <CardHeader
                  title="Answered"
                  description={`${answeredQuestions.length} answered`}
                />
                <CardBody className="p-0">
                  <ul className="divide-y divide-tan-100">
                    {answeredQuestions.map((question) => (
                      <li key={question.id} className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="track">
                            {QUESTION_STATUS_LABELS[question.status]}
                          </Badge>
                          <span className="text-[0.78rem] text-ink-400">
                            {question.student_name}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-ink-700">
                          {question.body}
                        </p>
                        {question.answer_body ? (
                          <p className="mt-1.5 rounded border border-track-200 bg-track-50 px-2 py-1.5 text-[0.85rem] text-ink-700">
                            {question.answer_body}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            ) : null}
          </div>
        )}
      </section>

      {aggregate.studentsWithoutEnoughData > 0 ? (
        <Notice tone="info" className="mt-8">
          {aggregate.studentsWithoutEnoughData} student
          {aggregate.studentsWithoutEnoughData === 1 ? " has" : "s have"} too
          little recorded activity for a readiness estimate. That is a data gap,
          not a signal about them — the{" "}
          <Link
            href={`/professor/courses/${courseId}/students?status=insufficient_data`}
          >
            {READINESS_PRESENTATION.insufficient_data.label.toLowerCase()} filter
          </Link>{" "}
          on the roster shows who.
        </Notice>
      ) : null}

      {roster.length > 0 ? (
        <Card className="mt-8">
          <CardHeader
            title="Individual statuses"
            description="Jump to a student's detail view to see the evidence behind their status."
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-tan-100">
              {roster.map((student) => {
                const result = readiness.find(
                  (r) => r.studentId === student.id,
                )!.result;
                return (
                  <li key={student.id}>
                    <Link
                      href={`/professor/courses/${courseId}/students/${student.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-2.5 no-underline hover:bg-paper-100"
                    >
                      <span className="min-w-0 truncate text-sm text-ink-800">
                        {student.name}
                      </span>
                      <StatusPill status={result.status} size="sm" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </>
  );
}
