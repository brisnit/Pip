"use client";

import { useActionState } from "react";
import { Button, Notice } from "@/components/ui/primitives";
import { Field, FormStatus, Select, TextArea, TextInput } from "@/components/ui/form";
import {
  SUPPORT_REQUEST_KINDS,
  SUPPORT_REQUEST_KIND_LABELS,
} from "@/lib/domain/vocabulary";
import {
  createSupportRequestAction,
  respondToRecommendationAction,
} from "@/app/student/actions";
import { emptyActionState } from "@/lib/forms/action-state";

/** Accept / complete / decline / ask-for-something-else, on one recommendation. */
export function RecommendationResponseForm({
  courseId,
  recommendationId,
  status,
}: {
  courseId: string;
  recommendationId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState(
    respondToRecommendationAction,
    emptyActionState,
  );

  const done = status === "completed";
  const declined = status === "declined";

  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <input
        type="hidden"
        name="recommendationId"
        value={recommendationId}
      />

      <div className="flex flex-wrap gap-2">
        {!done ? (
          <>
            {status === "recommended" ? (
              <Button
                type="submit"
                name="status"
                value="accepted"
                size="sm"
                disabled={pending}
              >
                Accept
              </Button>
            ) : null}
            <Button
              type="submit"
              name="status"
              value="completed"
              variant={status === "recommended" ? "secondary" : "primary"}
              size="sm"
              disabled={pending}
            >
              Mark complete
            </Button>
            <Button
              type="submit"
              name="status"
              value="alternative_requested"
              variant="secondary"
              size="sm"
              disabled={pending}
            >
              Ask for another option
            </Button>
          </>
        ) : (
          <Button
            type="submit"
            name="status"
            value="accepted"
            variant="secondary"
            size="sm"
            disabled={pending}
          >
            Reopen
          </Button>
        )}
        {!declined && !done ? (
          <Button
            type="submit"
            name="status"
            value="declined"
            variant="ghost"
            size="sm"
            disabled={pending}
          >
            This does not fit
          </Button>
        ) : null}
      </div>

      <Field
        id={`note-${recommendationId}`}
        label="Add a note for your professor"
        hint="Required if you are declining, so they can suggest something that fits better."
        error={state.error}
      >
        {(props) => <TextArea {...props} name="note" rows={2} />}
      </Field>

      <FormStatus message={state.message} />
    </form>
  );
}

export function SupportRequestForm({
  courseId,
  recommendationId,
  defaultKind,
  defaultTopics,
  taName,
  professorName,
  tutoringCenterName,
}: {
  courseId: string;
  recommendationId?: string;
  defaultKind?: string;
  defaultTopics?: string;
  taName: string;
  professorName: string;
  tutoringCenterName: string;
}) {
  const [state, action, pending] = useActionState(
    createSupportRequestAction,
    emptyActionState,
  );

  const descriptions: Record<string, string> = {
    teaching_assistant: `Goes to ${taName}.`,
    tutoring: `Goes to ${tutoringCenterName}.`,
    office_hours: `Goes to ${professorName}.`,
    peer_study: "Goes to your professor, who can connect you with a group.",
  };

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />
      {recommendationId ? (
        <input
          type="hidden"
          name="recommendationId"
          value={recommendationId}
        />
      ) : null}

      {state.error ? <Notice tone="caution">{state.error}</Notice> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`req-kind-${recommendationId ?? "new"}`} label="What would help?" required>
          {(props) => (
            <Select
              {...props}
              name="kind"
              defaultValue={defaultKind ?? "teaching_assistant"}
            >
              {SUPPORT_REQUEST_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {SUPPORT_REQUEST_KIND_LABELS[kind]} — {descriptions[kind]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          id={`req-time-${recommendationId ?? "new"}`}
          label="When are you free?"
          hint="Plain language is fine. No calendar is booked."
        >
          {(props) => (
            <TextInput
              {...props}
              name="preferredTime"
              placeholder="Any afternoon this week"
            />
          )}
        </Field>
      </div>

      <Field
        id={`req-topics-${recommendationId ?? "new"}`}
        label="Which topics?"
        hint="Separate them with semicolons. Naming specific topics is what makes the response useful — a preparation summary is built from them for both sides."
        required
      >
        {(props) => (
          <TextInput
            {...props}
            name="topics"
            defaultValue={defaultTopics}
            placeholder="Imputed vs. infused righteousness; simul iustus et peccator"
          />
        )}
      </Field>

      <Field
        id={`req-message-${recommendationId ?? "new"}`}
        label="Anything else you want them to know"
      >
        {(props) => <TextArea {...props} name="message" rows={3} />}
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit request"}
        </Button>
        <FormStatus message={state.message} />
      </div>
    </form>
  );
}
