"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/primitives";
import { FormStatus } from "@/components/ui/form";
import {
  rotateCourseCodeAction,
} from "@/app/professor/actions";
import { emptyActionState } from "@/lib/forms/action-state";

export function RotateCodeForm({ courseId }: { courseId: string }) {
  const [state, action, pending] = useActionState(
    rotateCourseCodeAction,
    emptyActionState,
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="courseId" value={courseId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Issuing…" : "Issue a new code"}
      </Button>
      <FormStatus
        message={state.error ?? state.message}
        tone={state.error ? "error" : "success"}
      />
      <p className="text-[0.8rem] text-ink-500">
        Retires the current code immediately. Students already in the course keep
        their access; only new joins are affected.
      </p>
    </form>
  );
}
