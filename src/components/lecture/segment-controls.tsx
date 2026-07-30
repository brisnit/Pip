"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/primitives";
import {
  Checkbox,
  Field,
  FormStatus,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui/form";
import {
  NOTE_KINDS,
  NOTE_KIND_LABELS,
  QUESTION_KINDS,
  QUESTION_KIND_LABELS,
} from "@/lib/domain/vocabulary";
import { formatClock } from "@/lib/domain/support";
import {
  askQuestionAction,
  createNoteAction,
} from "@/app/student/actions";
import { emptyActionState } from "@/lib/forms/action-state";

export type SegmentContext = {
  courseId: string;
  lectureId: string;
  segmentId: string;
  segmentHeading: string;
  atSeconds: number;
  transcriptExcerpt: string | null;
  objectiveId: string | null;
};

function hiddenContext(context: SegmentContext) {
  return (
    <>
      <input type="hidden" name="courseId" value={context.courseId} />
      <input type="hidden" name="lectureId" value={context.lectureId} />
      <input type="hidden" name="segmentId" value={context.segmentId} />
      <input
        type="hidden"
        name="segmentHeading"
        value={context.segmentHeading}
      />
      <input type="hidden" name="atSeconds" value={context.atSeconds} />
      <input
        type="hidden"
        name="transcriptExcerpt"
        value={context.transcriptExcerpt ?? ""}
      />
      <input
        type="hidden"
        name="objectiveId"
        value={context.objectiveId ?? ""}
      />
    </>
  );
}

/**
 * Note composer anchored to a lecture section.
 *
 * Every hidden field here exists so the student never has to explain which part
 * of the lecture they mean: the section, the timestamp, the transcript excerpt and
 * the learning objective all travel with the note.
 */
export function SegmentNoteForm({ context }: { context: SegmentContext }) {
  const [state, action, pending] = useActionState(
    createNoteAction,
    emptyActionState,
  );

  return (
    <form action={action} className="space-y-3">
      {hiddenContext(context)}

      <p className="rounded border border-tan-100 bg-paper-100 px-2.5 py-1.5 text-[0.8rem] text-ink-500">
        Anchored to <strong>{context.segmentHeading}</strong> at{" "}
        {formatClock(context.atSeconds)}. You will not have to reconstruct what
        this was about.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`note-kind-${context.segmentId}`} label="Kind of note">
          {(props) => (
            <Select {...props} name="kind" defaultValue="timestamped">
              {NOTE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {NOTE_KIND_LABELS[kind]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field id={`note-title-${context.segmentId}`} label="Title">
          {(props) => <TextInput {...props} name="title" maxLength={140} />}
        </Field>
      </div>

      <Field
        id={`note-body-${context.segmentId}`}
        label="Your note"
        error={state.error}
        required
      >
        {(props) => <TextArea {...props} name="body" rows={4} />}
      </Field>

      <Checkbox
        id={`note-shared-${context.segmentId}`}
        name="shared"
        label="Share this note with my professor"
        hint="Off by default. Everything you write stays private unless you tick this."
      />

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save note"}
        </Button>
        <FormStatus message={state.message} />
      </div>
    </form>
  );
}

export function SegmentQuestionForm({ context }: { context: SegmentContext }) {
  const [state, action, pending] = useActionState(
    askQuestionAction,
    emptyActionState,
  );

  return (
    <form action={action} className="space-y-3">
      {hiddenContext(context)}

      <p className="rounded border border-tan-100 bg-paper-100 px-2.5 py-1.5 text-[0.8rem] text-ink-500">
        Your professor sees this alongside <strong>{context.segmentHeading}</strong>{" "}
        and the transcript excerpt, so you do not need to set the scene.
      </p>

      <Field
        id={`q-kind-${context.segmentId}`}
        label="What are you asking for?"
      >
        {(props) => (
          <Select {...props} name="kind" defaultValue="question">
            {QUESTION_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {QUESTION_KIND_LABELS[kind]}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        id={`q-body-${context.segmentId}`}
        label="Your question"
        error={state.error}
        required
      >
        {(props) => <TextArea {...props} name="body" rows={3} />}
      </Field>

      <Checkbox
        id={`q-anon-${context.segmentId}`}
        name="anonymous"
        label="Ask without my name attached"
        hint="Your professor still sees the question and the lecture moment, but not who asked."
      />

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Submitting…" : "Submit question"}
        </Button>
        <FormStatus message={state.message} />
      </div>
    </form>
  );
}

/** Free-form note composer for the notes page, with an optional timestamp. */
export function StandaloneNoteForm({
  courseId,
  lectures,
}: {
  courseId: string;
  lectures: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(
    createNoteAction,
    emptyActionState,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="sn-kind" label="Kind of note">
          {(props) => (
            <Select {...props} name="kind" defaultValue="free_form">
              {NOTE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {NOTE_KIND_LABELS[kind]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field id="sn-lectureId" label="Related lecture">
          {(props) => (
            <Select {...props} name="lectureId">
              <option value="">Not tied to a lecture</option>
              {lectures.map((lecture) => (
                <option key={lecture.id} value={lecture.id}>
                  {lecture.title}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          id="sn-scriptureReference"
          label="Scripture reference"
          hint="For scripture notes."
        >
          {(props) => (
            <TextInput
              {...props}
              name="scriptureReference"
              placeholder="Romans 1:16–17"
            />
          )}
        </Field>
      </div>

      <Field id="sn-title" label="Title">
        {(props) => <TextInput {...props} name="title" maxLength={140} />}
      </Field>

      <Field id="sn-body" label="Your note" error={state.error} required>
        {(props) => <TextArea {...props} name="body" rows={5} />}
      </Field>

      <Checkbox
        id="sn-shared"
        name="shared"
        label="Share this note with my professor"
        hint="Off by default."
      />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save note"}
        </Button>
        <FormStatus message={state.message} />
      </div>
    </form>
  );
}
