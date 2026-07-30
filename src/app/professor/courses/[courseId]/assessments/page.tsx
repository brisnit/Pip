import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AIProvenance, NeedsReviewFrame } from "@/components/ui/ai-label";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Meter,
  Notice,
  SectionHeading,
} from "@/components/ui/primitives";
import {
  ASSESSMENT_TYPE_LABELS,
  HUMAN_GRADED_ASSESSMENT_TYPES,
  QUESTION_TYPE_LABELS,
} from "@/lib/domain/vocabulary";
import { formatDateTime, percent } from "@/lib/format";
import { listArtifacts, parseArtifact } from "@/lib/ai";
import type {
  GeneratedQuestion,
  StudyGuidePayload,
} from "@/lib/ai/types";
import {
  assessmentResults,
  listAssessmentQuestions,
  listAssessments,
} from "@/lib/repositories/assessments";
import { getCourse, listObjectives } from "@/lib/repositories/courses";
import { listStudentLectures } from "@/lib/repositories/lectures";
import {
  AssessmentForm,
  GenerateQuestionsForm,
  GenerateStudyGuideForm,
} from "./assessment-forms";

export const metadata: Metadata = { title: "Assessments" };

export default async function AssessmentsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  if (!course) notFound();

  const objectives = listObjectives(courseId);
  const lectures = listStudentLectures(courseId);
  const assessments = listAssessments(courseId).map((assessment) => ({
    ...assessment,
    questions: listAssessmentQuestions(assessment.id),
    results: assessmentResults(assessment.id),
  }));

  const questionDrafts = listArtifacts({
    courseId,
    kind: "question_drafts",
    limit: 3,
  });
  const studyGuides = listArtifacts({ courseId, kind: "study_guide", limit: 3 });

  return (
    <>
      <SectionHeading
        level={1}
        title="Assessments"
        description="Quizzes, exams, practice sets and comprehension checks, with what they are tied to."
      />

      {assessments.length === 0 ? (
        <EmptyState
          title="No assessments yet"
          description="Add a practice set first. Practice results feed the readiness model without carrying grade weight, which is what makes honest answers possible."
        />
      ) : (
        <ul className="space-y-4">
          {assessments.map((assessment) => {
            const scorable = assessment.results.filter((r) => r.autoScored);
            const written = assessment.results.filter((r) => !r.autoScored);
            const humanGraded = HUMAN_GRADED_ASSESSMENT_TYPES.includes(
              assessment.type,
            );

            return (
              <Card as="li" key={assessment.id}>
                <CardBody>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-serif text-lg leading-snug">
                        {assessment.title}
                      </h2>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[0.8rem] text-ink-500">
                        <Badge tone="burgundy">
                          {ASSESSMENT_TYPE_LABELS[assessment.type]}
                        </Badge>
                        {assessment.is_practice === 1 ? (
                          <Badge tone="track">Practice — not graded</Badge>
                        ) : null}
                        {assessment.scheduled_at ? (
                          <span>{formatDateTime(assessment.scheduled_at)}</span>
                        ) : null}
                        {assessment.weight_label ? (
                          <span>· {assessment.weight_label}</span>
                        ) : null}
                        {assessment.objective_codes ? (
                          <span>· {assessment.objective_codes}</span>
                        ) : null}
                      </p>
                      {assessment.description ? (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
                          {assessment.description}
                        </p>
                      ) : null}
                      {assessment.professor_guidance ? (
                        <p className="mt-2 max-w-2xl rounded border border-sand-100 bg-cream-100 px-3 py-2 text-[0.85rem] text-ink-600">
                          <span className="font-medium">Your guidance:</span>{" "}
                          {assessment.professor_guidance}
                        </p>
                      ) : null}
                    </div>

                    <dl className="shrink-0 text-right text-[0.82rem] text-ink-500">
                      <div>
                        <dt className="inline">Questions </dt>
                        <dd className="inline font-medium text-ink-700">
                          {assessment.question_count}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline">Responded </dt>
                        <dd className="inline font-medium text-ink-700">
                          {assessment.response_count}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {humanGraded ? (
                    <Notice tone="info" className="mt-4">
                      This assessment type is read by a person. The prototype
                      stores responses verbatim and does not score them — it will
                      not present an automated judgement about theological writing
                      as if it were authoritative.
                    </Notice>
                  ) : null}

                  {assessment.questions.length > 0 ? (
                    <details className="mt-4 border-t border-sand-100 pt-3">
                      <summary className="cursor-pointer text-sm font-medium text-burgundy-700">
                        Questions and results
                      </summary>
                      <ul className="mt-3 space-y-4">
                        {assessment.questions.map((question) => {
                          const result = assessment.results.find(
                            (r) => r.questionId === question.id,
                          );
                          return (
                            <li key={question.id}>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge>
                                  {QUESTION_TYPE_LABELS[question.type]}
                                </Badge>
                                {question.objective_code ? (
                                  <span className="text-[0.78rem] text-ink-400">
                                    {question.objective_code}
                                  </span>
                                ) : null}
                                {question.ai_generated === 1 ? (
                                  <Badge tone="gold">AI draft, edited</Badge>
                                ) : null}
                              </div>
                              <p className="mt-1 text-sm text-ink-800">
                                {question.prompt}
                              </p>
                              {question.options.length > 0 ? (
                                <ul className="mt-1 space-y-0.5">
                                  {question.options.map((option) => (
                                    <li
                                      key={option.id}
                                      className="text-[0.82rem] text-ink-600"
                                    >
                                      <span
                                        aria-hidden="true"
                                        className={
                                          option.is_correct === 1
                                            ? "mr-1.5 text-track-500"
                                            : "mr-1.5 text-ink-300"
                                        }
                                      >
                                        {option.is_correct === 1 ? "✓" : "·"}
                                      </span>
                                      {option.text}
                                      {option.is_correct === 1 ? (
                                        <span className="sr-only">
                                          {" "}
                                          (correct answer)
                                        </span>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-1 text-[0.82rem] italic text-ink-400">
                                  Written response — read by you, never
                                  auto-marked.
                                </p>
                              )}
                              {result && result.autoScored && result.responses > 0 ? (
                                <div className="mt-2">
                                  <Meter
                                    label="Class accuracy"
                                    value={result.correct}
                                    max={Math.max(result.responses, 1)}
                                    valueText={`${result.correct} of ${result.responses} correct (${percent(
                                      result.correct /
                                        Math.max(result.responses, 1),
                                    )})`}
                                    tone={
                                      result.correct /
                                        Math.max(result.responses, 1) >=
                                      0.75
                                        ? "track"
                                        : "attention"
                                    }
                                  />
                                </div>
                              ) : null}
                              {question.explanation ? (
                                <p className="mt-1.5 text-[0.82rem] text-ink-500">
                                  <span className="font-medium">
                                    Explanation:
                                  </span>{" "}
                                  {question.explanation}
                                </p>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  ) : null}

                  {scorable.length > 0 || written.length > 0 ? (
                    <p className="mt-3 text-[0.8rem] text-ink-400">
                      {scorable.length} auto-scored question
                      {scorable.length === 1 ? "" : "s"}, {written.length} read by
                      you.
                    </p>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
        </ul>
      )}

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="AI-assisted drafting"
            description="Drafts only. Nothing reaches an assessment or a student without your edit and approval."
          />
          <CardBody className="space-y-6">
            {lectures.length > 0 ? (
              <GenerateQuestionsForm
                courseId={courseId}
                lectures={lectures.map((lecture) => ({
                  id: lecture.id,
                  title: lecture.title,
                }))}
              />
            ) : (
              <p className="text-sm text-ink-500">
                Publish a lecture first — question drafting works from your section
                headings and key terms.
              </p>
            )}
            <div className="border-t border-sand-100 pt-5">
              <GenerateStudyGuideForm
                courseId={courseId}
                assessments={assessments.map((assessment) => ({
                  id: assessment.id,
                  title: assessment.title,
                }))}
              />
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          {questionDrafts.map((artifact) => {
            const questions = parseArtifact<GeneratedQuestion[]>(artifact);
            return (
              <Card key={artifact.id}>
                <CardHeader
                  title={artifact.title ?? "Question drafts"}
                  description={formatDateTime(artifact.created_at)}
                  level={3}
                />
                <CardBody className="space-y-4">
                  <AIProvenance
                    provenance={{
                      providerId: artifact.provider_id,
                      providerLabel: artifact.provider_label,
                      isSimulated: artifact.is_simulated === 1,
                      model: null,
                      generatedAt: artifact.created_at,
                      sourceNote: artifact.source_note ?? "",
                    }}
                  />
                  <NeedsReviewFrame approved={artifact.approved === 1}>
                    <ol className="space-y-3">
                      {questions.map((question, index) => (
                        <li key={index} className="text-sm">
                          <p className="text-ink-800">{question.prompt}</p>
                          <ul className="mt-1 space-y-0.5">
                            {question.options.map((option, optionIndex) => (
                              <li
                                key={optionIndex}
                                className="text-[0.82rem] text-ink-600"
                              >
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
                              </li>
                            ))}
                          </ul>
                          <p className="mt-1 text-[0.8rem] text-ink-400">
                            {question.sourceLabel}
                            {question.objectiveCode
                              ? ` · ${question.objectiveCode}`
                              : ""}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </NeedsReviewFrame>
                  <p className="text-[0.82rem] text-ink-500">
                    To use any of these, copy the ones worth keeping into the
                    question field below and edit them. Drafts are not
                    auto-imported by design.
                  </p>
                </CardBody>
              </Card>
            );
          })}

          {studyGuides.map((artifact) => {
            const guide = parseArtifact<StudyGuidePayload>(artifact);
            return (
              <Card key={artifact.id}>
                <CardHeader
                  title={guide.title}
                  description={formatDateTime(artifact.created_at)}
                  level={3}
                />
                <CardBody className="space-y-4">
                  <AIProvenance
                    provenance={{
                      providerId: artifact.provider_id,
                      providerLabel: artifact.provider_label,
                      isSimulated: artifact.is_simulated === 1,
                      model: null,
                      generatedAt: artifact.created_at,
                      sourceNote: artifact.source_note ?? "",
                    }}
                  />
                  <NeedsReviewFrame approved={artifact.approved === 1}>
                    <p className="text-sm text-ink-600">{guide.intro}</p>
                    <ul className="mt-3 space-y-3">
                      {guide.sections.slice(0, 6).map((section, index) => (
                        <li key={index}>
                          <p className="text-sm font-medium text-ink-800">
                            {section.heading}
                          </p>
                          <p className="mt-0.5 text-[0.85rem] text-ink-600">
                            {section.body}
                          </p>
                          <p className="mt-0.5 text-[0.78rem] text-ink-400">
                            Source: {section.sourceLabel}
                          </p>
                        </li>
                      ))}
                    </ul>
                    {guide.sections.length > 6 ? (
                      <p className="mt-2 text-[0.82rem] text-ink-400">
                        + {guide.sections.length - 6} more section(s)
                      </p>
                    ) : null}
                  </NeedsReviewFrame>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="mt-8">
        <CardHeader
          title="Add an assessment"
          description="Tie it to objectives and lectures so results become readiness evidence rather than an isolated score."
        />
        <CardBody>
          <AssessmentForm
            courseId={courseId}
            objectives={objectives}
            lectures={lectures.map((lecture) => ({
              id: lecture.id,
              title: lecture.title,
            }))}
          />
        </CardBody>
      </Card>
    </>
  );
}
