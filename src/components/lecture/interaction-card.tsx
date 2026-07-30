import {
  recordConfidenceAction,
  respondToInteractionAction,
} from "@/app/student/actions";
import { Badge, Button, Card, CardBody } from "@/components/ui/primitives";
import { TextArea } from "@/components/ui/form";
import {
  INFORMATIONAL_INTERACTION_TYPES,
  INTERACTION_TYPE_LABELS,
  WRITTEN_INTERACTION_TYPES,
} from "@/lib/domain/vocabulary";
import type { InteractionWithOptions } from "@/lib/repositories/lectures";
import type { InteractionResponseRow } from "@/lib/repositories/types";

const CONFIDENCE_LABELS = [
  "Not at all confident",
  "Not very confident",
  "Somewhat confident",
  "Confident",
  "Very confident",
];

/**
 * A single professor-authored interactive moment, with the student's response
 * state.
 *
 * Informational types (definitions, exam emphasis, historical context) render as
 * marginalia. Scored and written types render a form. Answered questions reveal
 * the explanation — the point is learning, not withholding.
 */
export function InteractionCard({
  interaction,
  response,
  courseId,
  lectureId,
}: {
  interaction: InteractionWithOptions;
  response: InteractionResponseRow | undefined;
  courseId: string;
  lectureId: string;
}) {
  const informational = INFORMATIONAL_INTERACTION_TYPES.includes(
    interaction.type,
  );
  const written = WRITTEN_INTERACTION_TYPES.includes(interaction.type);
  const isScored = interaction.type === "comprehension_question";
  const isPoll = interaction.type === "poll";
  const isConfidence = interaction.type === "confidence_rating";
  const answered = Boolean(response);

  if (informational) {
    return (
      <aside className="rounded-md border-l-4 border-gold-300 bg-gold-100/50 px-4 py-3">
        <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-gold-600">
          {INTERACTION_TYPE_LABELS[interaction.type]}
        </p>
        <p className="mt-1 text-sm font-medium text-ink-800">
          {interaction.prompt}
        </p>
        {interaction.body ? (
          <p className="mt-1 text-[0.88rem] leading-relaxed text-ink-600">
            {interaction.body}
          </p>
        ) : null}
        {interaction.concept_name ? (
          <p className="mt-1.5 text-[0.78rem] text-ink-500">
            Key term: {interaction.concept_name}
          </p>
        ) : null}
      </aside>
    );
  }

  return (
    <Card className={answered ? "border-track-200 bg-track-50/40" : "bg-cream-50"}>
      <CardBody className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={isScored ? "burgundy" : "gold"}>
            {INTERACTION_TYPE_LABELS[interaction.type]}
          </Badge>
          {answered ? (
            <Badge tone="track">
              <span aria-hidden="true">✓</span> Answered
            </Badge>
          ) : null}
          {interaction.objective_text ? (
            <span className="text-[0.75rem] text-ink-400">
              Objective: {interaction.objective_text.slice(0, 60)}
            </span>
          ) : null}
        </div>

        <p className="mt-2 text-sm font-medium text-ink-800">
          {interaction.prompt}
        </p>
        {interaction.body ? (
          <p className="mt-1 text-[0.88rem] text-ink-600">{interaction.body}</p>
        ) : null}

        {isConfidence ? (
          <form action={recordConfidenceAction} className="mt-3">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="lectureId" value={lectureId} />
            <input
              type="hidden"
              name="objectiveId"
              value={interaction.objective_id ?? ""}
            />
            <input
              type="hidden"
              name="conceptId"
              value={interaction.concept_id ?? ""}
            />
            <input type="hidden" name="context" value={interaction.prompt} />
            <fieldset>
              <legend className="text-[0.82rem] text-ink-600">
                Rate your confidence — this is used to help you, never to mark you.
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <Button
                    key={level}
                    type="submit"
                    name="level"
                    value={level}
                    variant="secondary"
                    size="sm"
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
        ) : written ? (
          <form action={respondToInteractionAction} className="mt-3 space-y-2">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="lectureId" value={lectureId} />
            <input
              type="hidden"
              name="interactionId"
              value={interaction.id}
            />
            <label
              htmlFor={`written-${interaction.id}`}
              className="block text-[0.82rem] text-ink-600"
            >
              Your response
            </label>
            <TextArea
              id={`written-${interaction.id}`}
              name="textResponse"
              rows={3}
              defaultValue={response?.text_response ?? ""}
            />
            <Button type="submit" variant="secondary" size="sm">
              {answered ? "Update response" : "Save response"}
            </Button>
            <p className="text-[0.78rem] text-ink-400">
              Written responses are stored for your professor to read. They are not
              scored.
            </p>
          </form>
        ) : interaction.options.length > 0 ? (
          <form action={respondToInteractionAction} className="mt-3">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="lectureId" value={lectureId} />
            <input type="hidden" name="interactionId" value={interaction.id} />
            <fieldset>
              <legend className="sr-only">{interaction.prompt}</legend>
              <ul className="space-y-1.5">
                {interaction.options.map((option) => {
                  const chosen = response?.option_id === option.id;
                  const revealCorrect = answered && isScored;
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
                          chosen ? "border-burgundy-400 bg-burgundy-50" : "",
                          revealCorrect && option.is_correct === 1
                            ? "border-track-500 bg-track-50"
                            : "",
                        ].join(" ")}
                      >
                        <span
                          aria-hidden="true"
                          className="mr-1 shrink-0 font-mono"
                        >
                          {revealCorrect
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
                        {revealCorrect && option.is_correct === 1 ? (
                          <span className="sr-only"> (correct answer)</span>
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
        ) : null}

        {answered && isScored ? (
          <div className="mt-3 border-t border-sand-100 pt-3">
            <p
              className={
                response?.is_correct === 1
                  ? "text-sm font-medium text-track-600"
                  : "text-sm font-medium text-attention-600"
              }
            >
              {response?.is_correct === 1
                ? "That's the answer this course is teaching."
                : "Not the answer this course is teaching — worth a second look."}
            </p>
            {interaction.explanation ? (
              <p className="mt-1 text-[0.88rem] leading-relaxed text-ink-600">
                {interaction.explanation}
              </p>
            ) : null}
            <p className="mt-1.5 text-[0.78rem] text-ink-400">
              You can change your answer. Your most recent answer is what counts.
            </p>
          </div>
        ) : null}

        {answered && isPoll ? (
          <p className="mt-3 border-t border-sand-100 pt-3 text-[0.85rem] text-ink-600">
            Response recorded. Polls have no right answer — your professor sees the
            distribution, not who chose what.
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
