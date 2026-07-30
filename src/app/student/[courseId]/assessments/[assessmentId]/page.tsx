import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { submitAssessmentResponseAction } from "@/app/student/actions";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Meter,
  Notice,
  SectionHeading,
} from "@/components/ui/primitives";
import { TextArea } from "@/components/ui/form";
import {
  ASSESSMENT_TYPE_LABELS,
  AUTO_SCORED_QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
} from "@/lib/domain/vocabulary";
import { percent } from "@/lib/format";
import {
  getAssessment,
  listAssessmentQuestions,
  listAssessmentResponses,
  studentAssessmentProgress,
} from "@/lib/repositories/assessments";
import { getCourse } from "@/lib/repositories/courses";
import { currentStudentInCourse } from "@/lib/role/role-context";

type Props = {
  params: Promise<{ courseId: string; assessmentId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { assessmentId } = await params;
  const assessment = getAssessment(assessmentId);
  return { title: assessment?.title ?? "Assessment" };
}

const CONFIDENCE_LABELS = [
  "Not at all confident",
  "Not very confident",
  "Somewhat confident",
  "Confident",
  "Very confident",
];

export default async function StudentAssessmentPage({ params }: Props) {
  const { courseId, assessmentId } = await params;
  const course = getCourse(courseId);
  const student = await currentStudentInCourse(courseId);
  const assessment = getAssessment(assessmentId);

  if (
    !course ||
    !student ||
    !assessment ||
    assessment.course_id !== courseId ||
    assessment.published === 0
  ) {
    notFound();
  }

  const questions = listAssessmentQuestions(assessmentId);
  const responses = listAssessmentResponses(student.studentId, assessmentId);
  const byQuestion = new Map(
    responses.map((response) => [response.question_id, response]),
  );
  const progress = studentAssessmentProgress(student.studentId, assessmentId);

  return (
    <>
      <p className="mb-2 text-[0.85rem]">
        <Link href={`/student/${courseId}/assessments`}>← Assessments</Link>
      </p>

      <SectionHeading
        level={1}
        title={assessment.title}
        description={assessment.description ?? undefined}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone="brand">
          {ASSESSMENT_TYPE_LABELS[assessment.type]}
        </Badge>
        {assessment.is_practice === 1 ? (
          <Badge tone="track">Practice — not graded</Badge>
        ) : null}
        {assessment.objective_codes ? (
          <span className="text-[0.82rem] text-ink-500">
            Objectives: {assessment.objective_codes}
          </span>
        ) : null}
      </div>

      {assessment.professor_guidance ? (
        <Notice tone="info" title={`From ${course.professor_name}`} className="mb-6">
          {assessment.professor_guidance}
        </Notice>
      ) : null}

      {progress.total > 0 ? (
        <Card className="mb-6">
          <CardBody className="space-y-3">
            <Meter
              label="Questions answered"
              value={progress.answered}
              max={progress.total}
              valueText={`${progress.answered} of ${progress.total}`}
              tone="brand"
            />
            {progress.scorable > 0 ? (
              <Meter
                label="Correct on auto-scored questions"
                value={progress.correct}
                max={progress.scorable}
                valueText={`${progress.correct} of ${progress.scorable} (${percent(
                  progress.correct / progress.scorable,
                )})`}
                tone={
                  progress.correct / progress.scorable >= 0.75
                    ? "track"
                    : "attention"
                }
              />
            ) : null}
            <p className="text-[0.82rem] text-ink-500">
              You can change any answer. Your most recent answer is what counts, and
              your responses feed your{" "}
              <Link href={`/student/${courseId}/readiness`}>readiness view</Link>{" "}
              immediately.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {questions.length === 0 ? (
        <Notice tone="info">
          No questions have been added to this assessment yet.
        </Notice>
      ) : (
        <ol className="space-y-4">
          {questions.map((question, index) => {
            const response = byQuestion.get(question.id);
            const answered = Boolean(response);
            const autoScored = AUTO_SCORED_QUESTION_TYPES.includes(question.type);
            const isConfidence =
              question.type === "confidence_rating" ||
              question.type === "self_assessment";

            return (
              <Card as="li" key={question.id}>
                <CardBody>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[0.78rem] font-medium text-ink-400">
                      Question {index + 1} of {questions.length}
                    </span>
                    <Badge>{QUESTION_TYPE_LABELS[question.type]}</Badge>
                    {answered ? (
                      <Badge tone="track">
                        <span aria-hidden="true">✓</span> Answered
                      </Badge>
                    ) : null}
                    {question.objective_code ? (
                      <span className="text-[0.75rem] text-ink-400">
                        {question.objective_code}
                      </span>
                    ) : null}
                    {question.ai_generated === 1 ? (
                      <Badge tone="accent">Drafted with AI, edited by professor</Badge>
                    ) : null}
                  </div>

                  <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-800">
                    {question.prompt}
                  </p>

                  {isConfidence ? (
                    <form
                      action={submitAssessmentResponseAction}
                      className="mt-3"
                    >
                      <input type="hidden" name="courseId" value={courseId} />
                      <input
                        type="hidden"
                        name="assessmentId"
                        value={assessmentId}
                      />
                      <input
                        type="hidden"
                        name="questionId"
                        value={question.id}
                      />
                      <fieldset>
                        <legend className="text-[0.82rem] text-ink-600">
                          Choose a rating. This is used to help you, never to mark
                          you.
                        </legend>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <Button
                              key={level}
                              type="submit"
                              name="confidence"
                              value={level}
                              variant="secondary"
                              size="sm"
                              className={
                                response?.confidence === level
                                  ? "border-brand-400 bg-brand-50 text-brand-700"
                                  : undefined
                              }
                              aria-pressed={response?.confidence === level}
                            >
                              {level}
                              <span className="sr-only">
                                {" "}
                                — {CONFIDENCE_LABELS[level - 1]}
                              </span>
                            </Button>
                          ))}
                        </div>
                        <p className="mt-1.5 text-[0.78rem] text-ink-400">
                          1 = {CONFIDENCE_LABELS[0]} · 5 = {CONFIDENCE_LABELS[4]}
                        </p>
                      </fieldset>
                    </form>
                  ) : question.options.length > 0 ? (
                    <form action={submitAssessmentResponseAction} className="mt-3">
                      <input type="hidden" name="courseId" value={courseId} />
                      <input
                        type="hidden"
                        name="assessmentId"
                        value={assessmentId}
                      />
                      <input
                        type="hidden"
                        name="questionId"
                        value={question.id}
                      />
                      <fieldset>
                        <legend className="sr-only">{question.prompt}</legend>
                        <ul className="space-y-1.5">
                          {question.options.map((option) => {
                            const chosen = response?.option_id === option.id;
                            const reveal = answered && autoScored;
                            return (
                              <li key={option.id}>
                                <Button
                                  type="submit"
                                  name="optionId"
                                  value={option.id}
                                  variant="secondary"
                                  size="sm"
                                  className={[
                                    "w-full justify-start text-left",
                                    chosen
                                      ? "border-brand-400 bg-brand-50"
                                      : "",
                                    reveal && option.is_correct === 1
                                      ? "border-track-500 bg-track-50"
                                      : "",
                                  ].join(" ")}
                                >
                                  <span
                                    aria-hidden="true"
                                    className="mr-1 shrink-0 font-mono"
                                  >
                                    {reveal
                                      ? option.is_correct === 1
                                        ? "✓"
                                        : chosen
                                          ? "✗"
                                          : "·"
                                      : chosen
                                        ? "●"
                                        : "○"}
                                  </span>
                                  <span className="min-w-0">{option.text}</span>
                                  {reveal && option.is_correct === 1 ? (
                                    <span className="sr-only">
                                      {" "}
                                      (correct answer)
                                    </span>
                                  ) : null}
                                  {chosen ? (
                                    <span className="sr-only"> (your answer)</span>
                                  ) : null}
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      </fieldset>
                    </form>
                  ) : (
                    <form
                      action={submitAssessmentResponseAction}
                      className="mt-3 space-y-2"
                    >
                      <input type="hidden" name="courseId" value={courseId} />
                      <input
                        type="hidden"
                        name="assessmentId"
                        value={assessmentId}
                      />
                      <input
                        type="hidden"
                        name="questionId"
                        value={question.id}
                      />
                      <label
                        htmlFor={`answer-${question.id}`}
                        className="block text-[0.82rem] text-ink-600"
                      >
                        Your answer
                      </label>
                      <TextArea
                        id={`answer-${question.id}`}
                        name="textResponse"
                        rows={4}
                        defaultValue={response?.text_response ?? ""}
                      />
                      <Button type="submit" variant="secondary" size="sm">
                        {answered ? "Update answer" : "Save answer"}
                      </Button>
                      <p className="text-[0.78rem] text-ink-400">
                        Written answers are stored for {course.professor_name} to
                        read. They are never auto-marked.
                      </p>
                    </form>
                  )}

                  {answered && autoScored ? (
                    <div className="mt-3 border-t border-tan-100 pt-3">
                      <p
                        className={
                          response?.is_correct === 1
                            ? "text-sm font-medium text-track-600"
                            : "text-sm font-medium text-attention-600"
                        }
                      >
                        {response?.is_correct === 1
                          ? "That's the answer this course is teaching."
                          : "Not the answer this course is teaching — worth another look."}
                      </p>
                      {question.explanation ? (
                        <p className="mt-1 text-[0.88rem] leading-relaxed text-ink-600">
                          {question.explanation}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
        </ol>
      )}

      <Card className="mt-8">
        <CardHeader title="What happens with these answers" />
        <CardBody>
          <ul className="space-y-2 text-sm text-ink-600">
            <li>
              Multiple-choice and true/false answers are scored automatically and
              feed your readiness view.
            </li>
            <li>
              Written answers are stored verbatim for {course.professor_name} to
              read. The prototype does not score them.
            </li>
            <li>
              Confidence ratings are a signal to help you, never a mark against you.
            </li>
            <li>
              {assessment.is_practice === 1
                ? "This is practice. Your professor sees class totals rather than your individual score."
                : "Your professor sees your individual responses for graded work."}
            </li>
          </ul>
          <p className="mt-4 text-[0.85rem]">
            <Link href={`/student/${courseId}/readiness`}>
              See how this changed your readiness →
            </Link>
          </p>
        </CardBody>
      </Card>
    </>
  );
}
