"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/primitives";
import { Field, FormStatus, TextArea } from "@/components/ui/form";
import {
  professorRespondAction,
} from "@/app/professor/actions";
import { emptyActionState } from "@/lib/forms/action-state";

export function RespondForm({
  courseId,
  recommendationId,
}: {
  courseId: string;
  recommendationId: string;
}) {
  const [state, action, pending] = useActionState(
    professorRespondAction,
    emptyActionState,
  );

  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="courseId" value={courseId} />
      <input
        type="hidden"
        name="recommendationId"
        value={recommendationId}
      />
      <Field
        id={`respond-${recommendationId}`}
        label="Reply to the student"
        error={state.error}
      >
        {(props) => <TextArea {...props} name="response" rows={2} />}
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send reply"}
        </Button>
        <FormStatus message={state.message} />
      </div>
    </form>
  );
}
