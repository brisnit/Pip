import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  setInteractionPublishedAction,
  setLectureStatusAction,
  setQuestionStatusAction,
} from "@/app/professor/actions";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Meter,
  SectionHeading,
  Stat,
} from "@/components/ui/primitives";
import {
  INTERACTION_TYPE_LABELS,
  LECTURE_STATUS_LABELS,
  MARKER_LABELS,
  QUESTION_KIND_LABELS,
  QUESTION_STATUS_LABELS,
} from "@/lib/domain/vocabulary";
import { formatClock } from "@/lib/domain/support";
import { percent, relativeTime } from "@/lib/format";
import { getCourse } from "@/lib/repositories/courses";
import {
  listQuestions,
  listSegmentConfusion,
} from "@/lib/repositories/engagement";
import {
  countEngagedStudents,
  countRecentlyActiveStudents,
  getLecture,
  listInteractions,
  listSegments,
  tallyInteractions,
} from "@/lib/repositories/lectures";
import { listSupportRequests } from "@/lib/repositories/support";
import {
  AnswerQuestionForm,
  CurrentTopicForm,
  LiveDisclaimer,
  LivePoller,
} from "./console-forms";

type Props = {
  params: Promise<{ courseId: string; lectureId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lectureId } = await params;
  const lecture = getLecture(lectureId);
  return { title: lecture ? `Live console — ${lecture.title}` : "Live console" };
}

export default async function LiveConsolePage({ params }: Props) {
  const { courseId, lectureId } = await params;
  const course = getCourse(courseId);
  const lecture = getLecture(lectureId);
  if (!course || !lecture || lecture.course_id !== courseId) notFound();

  const isLive = lecture.status === "live";
  const segments = listSegments(lectureId);
  const interactions = listInteractions(lectureId);
  const tallies = tallyInteractions(lectureId);
  const questions = listQuestions(courseId, { lectureId });
  const openQuestions = questions.filter((q) => q.status === "open");
  const confusion = listSegmentConfusion(courseId, lectureId);
  const supportRequests = listSupportRequests(courseId).filter(
    (request) => request.status === "submitted",
  );

  // "Active" means students with any recorded activity on this lecture in the last
  // 30 minutes. There is no presence channel in this prototype.
  const activeStudents = countRecentlyActiveStudents(lectureId, 30);
  const engagedStudents = countEngagedStudents(lectureId);

  const scoredTallies = tallies.filter(
    (tally) => tally.type === "comprehension_question" && tally.responses > 0,
  );
  const confidenceTallies = tallies.filter(
    (tally) => tally.type === "confidence_rating",
  );

  return (
    <>
      <p className="mb-2 text-[0.85rem]">
        <Link href={`/professor/courses/${courseId}/content`}>
          ← Content and lectures
        </Link>
      </p>

      <SectionHeading
        level={1}
        title={lecture.title}
        description={`${LECTURE_STATUS_LABELS[lecture.status]}${
          lecture.live_started_at
            ? ` · started ${relativeTime(lecture.live_started_at)}`
            : ""
        }`}
        action={
          <form action={setLectureStatusAction} className="flex gap-2">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="lectureId" value={lectureId} />
            <input
              type="hidden"
              name="status"
              value={isLive ? "ended" : "live"}
            />
            <Button type="submit" variant={isLive ? "danger" : "primary"}>
              {isLive ? "End lecture" : "Start lecture"}
            </Button>
          </form>
        }
      />

      <div className="mb-6 space-y-4">
        <LiveDisclaimer />
        <LivePoller enabled={isLive} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Where you are" />
          <CardBody className="space-y-5">
            <CurrentTopicForm
              courseId={courseId}
              lectureId={lectureId}
              currentTopic={lecture.current_topic}
            />
            {segments.length > 0 ? (
              <div className="border-t border-sand-100 pt-4">
                <h3 className="text-sm font-semibold">Outline</h3>
                <ol className="mt-2 space-y-1">
                  {segments.map((segment) => (
                    <li key={segment.id} className="text-sm text-ink-600">
                      <span className="mr-2 font-mono text-[0.8rem] text-ink-400">
                        {formatClock(segment.start_seconds)}
                      </span>
                      {segment.heading}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Right now" level={3} />
          <CardBody>
            <dl className="grid grid-cols-2 gap-4">
              <Stat
                label="Active in last 30 min"
                value={activeStudents}
                detail="Students with any recorded activity on this lecture"
              />
              <Stat
                label="Worked in this lecture"
                value={engagedStudents}
                detail="All time"
              />
              <Stat
                label="Open questions"
                value={openQuestions.length}
                tone={openQuestions.length > 0 ? "attention" : "neutral"}
              />
              <Stat
                label="Help requested"
                value={supportRequests.length}
                tone={supportRequests.length > 0 ? "concern" : "neutral"}
              />
            </dl>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Publish a moment"
            description="Publishing makes an interactive moment visible on the student lecture page. Unpublish to hold one back."
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-sand-100">
              {interactions.map((interaction) => (
                <li
                  key={interaction.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="gold">
                        {INTERACTION_TYPE_LABELS[interaction.type]}
                      </Badge>
                      {interaction.segment_heading ? (
                        <span className="text-[0.78rem] text-ink-400">
                          {interaction.segment_heading}
                        </span>
                      ) : null}
                      {interaction.published === 1 ? (
                        <Badge tone="track">
                          <span aria-hidden="true">✓</span> Published
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Held back</Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-ink-700">
                      {interaction.prompt}
                    </p>
                  </div>
                  <form action={setInteractionPublishedAction} className="shrink-0">
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="lectureId" value={lectureId} />
                    <input
                      type="hidden"
                      name="interactionId"
                      value={interaction.id}
                    />
                    <input
                      type="hidden"
                      name="published"
                      value={interaction.published === 1 ? "0" : "1"}
                    />
                    <Button type="submit" variant="secondary" size="sm">
                      {interaction.published === 1 ? "Hold back" : "Publish"}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Comprehension results"
              description="Counts only. No individual student is named here."
              level={3}
            />
            <CardBody className="space-y-4">
              {scoredTallies.length === 0 ? (
                <p className="text-sm text-ink-500">
                  No comprehension answers recorded for this lecture yet.
                </p>
              ) : (
                scoredTallies.map((tally) => (
                  <div key={tally.interactionId}>
                    <Meter
                      label={tally.prompt}
                      value={tally.correct ?? 0}
                      max={Math.max(tally.responses, 1)}
                      valueText={`${tally.correct} of ${tally.responses} correct (${percent(
                        (tally.correct ?? 0) / Math.max(tally.responses, 1),
                      )})`}
                      tone={
                        (tally.correct ?? 0) / Math.max(tally.responses, 1) >= 0.75
                          ? "track"
                          : (tally.correct ?? 0) / Math.max(tally.responses, 1) >=
                              0.5
                            ? "attention"
                            : "concern"
                      }
                    />
                    <ul className="mt-2 space-y-1 pl-1">
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
                ))
              )}

              {confidenceTallies.length > 0 ? (
                <div className="border-t border-sand-100 pt-4">
                  <h4 className="text-sm font-semibold">Confidence ratings</h4>
                  {confidenceTallies.map((tally) => (
                    <p key={tally.interactionId} className="mt-1 text-[0.85rem] text-ink-600">
                      {tally.responses} student
                      {tally.responses === 1 ? "" : "s"} responded to
                      &ldquo;{tally.prompt}&rdquo;
                    </p>
                  ))}
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Confusion indicators"
              description="Segments students marked confusing during this lecture."
              level={3}
            />
            <CardBody>
              {confusion.length === 0 ? (
                <p className="text-sm text-ink-500">
                  Nothing marked confusing in this lecture.
                </p>
              ) : (
                <ol className="space-y-3">
                  {confusion.map((row) => (
                    <li key={row.segment_id}>
                      <Meter
                        label={row.heading}
                        value={row.confusing}
                        max={Math.max(row.confusing + row.clear, 1)}
                        valueText={`${row.confusing} ${MARKER_LABELS.confusing.toLowerCase()} · ${row.clear} clear`}
                        tone={row.confusing > row.clear ? "concern" : "attention"}
                      />
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Incoming questions"
          description="Ordered by upvotes. Answering one publishes your response on the student lecture page."
        />
        <CardBody className="p-0">
          {questions.length === 0 ? (
            <p className="px-5 py-4 text-sm text-ink-500">
              No questions have been submitted on this lecture.
            </p>
          ) : (
            <ul className="divide-y divide-sand-100">
              {questions.map((question) => (
                <li key={question.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="burgundy">
                          {QUESTION_KIND_LABELS[question.kind]}
                        </Badge>
                        <Badge
                          tone={
                            question.status === "open" ? "attention" : "track"
                          }
                        >
                          {QUESTION_STATUS_LABELS[question.status]}
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

                      <p className="mt-2 text-sm text-ink-800">{question.body}</p>

                      <p className="mt-1 text-[0.8rem] text-ink-400">
                        {question.anonymous === 1
                          ? "Submitted anonymously"
                          : question.student_name}
                        {question.segment_heading
                          ? ` · on "${question.segment_heading}"`
                          : ""}
                        {" · "}
                        {relativeTime(question.created_at)}
                      </p>

                      {question.transcript_excerpt ? (
                        <blockquote className="mt-2 border-l-2 border-gold-300 pl-3 text-[0.82rem] italic text-ink-500">
                          {question.transcript_excerpt}
                        </blockquote>
                      ) : null}

                      {question.answer_body ? (
                        <div className="mt-3 rounded-md border border-track-200 bg-track-50 px-3 py-2">
                          <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-track-600">
                            Your answer
                          </p>
                          <p className="mt-1 text-[0.85rem] text-ink-700">
                            {question.answer_body}
                          </p>
                        </div>
                      ) : (
                        <AnswerQuestionForm
                          courseId={courseId}
                          questionId={question.id}
                        />
                      )}
                    </div>

                    {question.status === "open" ? (
                      <form action={setQuestionStatusAction} className="shrink-0">
                        <input type="hidden" name="courseId" value={courseId} />
                        <input
                          type="hidden"
                          name="questionId"
                          value={question.id}
                        />
                        <input type="hidden" name="status" value="addressed" />
                        <Button type="submit" variant="secondary" size="sm">
                          Mark addressed in class
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {supportRequests.length > 0 ? (
        <Card className="mt-6">
          <CardHeader
            title="Students who have requested help"
            description="Submitted through their support plan."
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-sand-100">
              {supportRequests.map((request) => (
                <li key={request.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-ink-800">
                    {request.student_name}
                  </p>
                  {request.topics ? (
                    <p className="mt-0.5 text-[0.85rem] text-ink-600">
                      Topics: {request.topics}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[0.8rem]">
                    <Link
                      href={`/professor/courses/${courseId}/support`}
                    >
                      Open in support →
                    </Link>
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </>
  );
}
