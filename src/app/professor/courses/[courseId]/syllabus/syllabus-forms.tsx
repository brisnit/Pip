"use client";

import { useActionState } from "react";
import { Button, Notice } from "@/components/ui/primitives";
import { Field, FormStatus, TextArea, TextInput } from "@/components/ui/form";
import {
  extractSyllabusAction,
  publishSyllabusAction,
  saveSyllabusTextAction,
} from "@/app/professor/actions";
import { emptyActionState } from "@/lib/forms/action-state";

export function SyllabusTextForm({
  courseId,
  defaultText,
  defaultFileName,
}: {
  courseId: string;
  defaultText?: string | null;
  defaultFileName?: string | null;
}) {
  const [state, action, pending] = useActionState(
    saveSyllabusTextAction,
    emptyActionState,
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="courseId" value={courseId} />

      <Field
        id="rawText"
        label="Syllabus text"
        hint="Paste the text of your syllabus. Keep the section headings — the extractor recognises headings such as “Learning Objectives”, “Weekly Schedule”, “Readings” and “Exams”."
        error={state.error}
        required
      >
        {(props) => (
          <TextArea
            {...props}
            name="rawText"
            rows={14}
            defaultValue={defaultText ?? ""}
            className="font-mono text-[0.85rem]"
          />
        )}
      </Field>

      <Field
        id="fileName"
        label="Original filename"
        hint="Recorded for reference only. Files are not stored here — no upload happens."
      >
        {(props) => (
          <TextInput
            {...props}
            name="fileName"
            defaultValue={defaultFileName ?? ""}
            placeholder="CH504-syllabus-summer-2026.pdf"
            className="max-w-md"
          />
        )}
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save syllabus text"}
        </Button>
        <FormStatus message={state.message} />
      </div>
    </form>
  );
}

export function ExtractSyllabusForm({ courseId }: { courseId: string }) {
  const [state, action, pending] = useActionState(
    extractSyllabusAction,
    emptyActionState,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <Button type="submit" disabled={pending}>
        {pending ? "Extracting…" : "Extract course structure"}
      </Button>
      {state.error ? (
        <Notice tone="caution">{state.error}</Notice>
      ) : (
        <FormStatus message={state.message} />
      )}
    </form>
  );
}

export function PublishSyllabusForm({ courseId }: { courseId: string }) {
  const [state, action, pending] = useActionState(
    publishSyllabusAction,
    emptyActionState,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <Button type="submit" disabled={pending}>
        {pending ? "Publishing…" : "Publish approved items into the course"}
      </Button>
      {state.error ? (
        <Notice tone="caution">{state.error}</Notice>
      ) : (
        <FormStatus message={state.message} />
      )}
      <p className="text-[0.82rem] text-ink-500">
        Approved objectives become learning objectives, weekly topics become
        modules, exams become assessments, and readings become course materials.
        Nothing unapproved is published.
      </p>
    </form>
  );
}
