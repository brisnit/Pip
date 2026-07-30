"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/primitives";
import { Field, TextInput } from "@/components/ui/form";
import { emptyActionState } from "@/lib/forms/action-state";
import { unlockAction } from "./actions";

export function UnlockForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(unlockAction, emptyActionState);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      <Field
        id="password"
        label="Access password"
        hint="Sent to you with the link to this prototype."
        error={state.error}
        required
      >
        {(props) => (
          <TextInput
            {...props}
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
          />
        )}
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Checking…" : "Open the prototype"}
      </Button>
    </form>
  );
}
