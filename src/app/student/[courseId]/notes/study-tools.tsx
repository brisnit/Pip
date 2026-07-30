"use client";

import { useActionState } from "react";
import { Button, Notice } from "@/components/ui/primitives";
import { Field, FormStatus, Select } from "@/components/ui/form";
import {
  generateFlashcardsAction,
  generateMyStudyGuideAction,
} from "@/app/student/actions";
import { emptyActionState } from "@/lib/forms/action-state";

export function StudyGuideForm({ courseId }: { courseId: string }) {
  const [state, action, pending] = useActionState(
    generateMyStudyGuideAction,
    emptyActionState,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <p className="text-sm text-ink-600">
        Builds a study guide from your course&rsquo;s objectives and key terms, plus
        the questions and exam-review notes you have written. It regroups material
        you already have — it does not invent content.
      </p>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Building…" : "Build a study guide"}
        </Button>
        <FormStatus message={state.message} />
      </div>
      {state.error ? <Notice tone="caution">{state.error}</Notice> : null}
    </form>
  );
}

export function FlashcardForm({
  courseId,
  lectures,
}: {
  courseId: string;
  lectures: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(
    generateFlashcardsAction,
    emptyActionState,
  );

  if (lectures.length === 0) return null;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <Field
        id="fc-lectureId"
        label="Make flashcards from a lecture"
        hint="Key terms, scripture references and section claims become cards."
      >
        {(props) => (
          <Select {...props} name="lectureId">
            {lectures.map((lecture) => (
              <option key={lecture.id} value={lecture.id}>
                {lecture.title}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Building…" : "Make flashcards"}
        </Button>
        <FormStatus message={state.message} />
      </div>
      {state.error ? <Notice tone="caution">{state.error}</Notice> : null}
    </form>
  );
}
