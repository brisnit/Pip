"use client";

import { useActionState } from "react";
import { Button, Notice } from "@/components/ui/primitives";
import { Field, FormStatus, TextArea, TextInput } from "@/components/ui/form";
import { emptyActionState, type ActionState } from "@/lib/forms/action-state";
import { cn } from "@/lib/cn";

/**
 * One form for both profiles, driven by the field definitions in
 * `lib/repositories/profiles.ts`. Adding a field there adds it here, to the
 * read-only view, and to the completeness calculation at once.
 */
export type SerialisableField = {
  key: string;
  label: string;
  hint?: string;
  long?: boolean;
  type?: "text" | "email" | "url" | "tel";
};

export function ProfileForm({
  action,
  fields,
  values,
  nameLabel,
  nameValue,
}: {
  action: (
    prev: ActionState,
    formData: FormData,
  ) => Promise<ActionState>;
  fields: SerialisableField[];
  values: Record<string, string>;
  nameLabel: string;
  nameValue: string;
}) {
  const [state, submit, pending] = useActionState(action, emptyActionState);

  return (
    <form action={submit} className="space-y-6">
      {state.error ? <Notice tone="caution">{state.error}</Notice> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="profile-name" label={nameLabel} required className="sm:col-span-2">
          {(props) => (
            <TextInput {...props} name="name" defaultValue={nameValue} maxLength={90} />
          )}
        </Field>

        {fields.map((field) => (
          <Field
            key={field.key}
            id={`profile-${field.key}`}
            label={field.label}
            hint={field.hint}
            className={cn(field.long && "sm:col-span-2")}
          >
            {(props) =>
              field.long ? (
                <TextArea
                  {...props}
                  name={field.key}
                  rows={4}
                  defaultValue={values[field.key] ?? ""}
                />
              ) : (
                <TextInput
                  {...props}
                  name={field.key}
                  type={field.type ?? "text"}
                  defaultValue={values[field.key] ?? ""}
                />
              )
            }
          </Field>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
        <FormStatus message={state.message} />
      </div>
    </form>
  );
}
