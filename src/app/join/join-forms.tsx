"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/primitives";
import { Checkbox, Field, TextInput } from "@/components/ui/form";
import {
  enterCourseAction,
  findCourseAction,
  type JoinState,
} from "./actions";

const initial: JoinState = { error: null };

export function CourseCodeForm() {
  const [state, action, pending] = useActionState(findCourseAction, initial);

  return (
    <form action={action} className="space-y-4">
      <Field
        id="code"
        label="Course code"
        hint="Six characters, shown by your professor or printed on the course card. Not case sensitive."
        error={state.error}
        required
      >
        {(props) => (
          <TextInput
            {...props}
            name="code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="e.g. CH504R"
            className="max-w-56 font-mono text-lg tracking-[0.2em] uppercase"
          />
        )}
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Looking up…" : "Find course"}
      </Button>
    </form>
  );
}

export function EnterCourseForm({
  accessCode,
  source,
  defaultName,
}: {
  accessCode: string;
  source: string;
  defaultName?: string;
}) {
  const [state, action, pending] = useActionState(enterCourseAction, initial);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="accessCode" value={accessCode} />
      <input type="hidden" name="source" value={source} />

      <Field
        id="name"
        label="Your full name"
        hint="Used so your professor can connect your coursework activity to you."
        error={state.error}
        required
      >
        {(props) => (
          <TextInput
            {...props}
            name="name"
            autoComplete="name"
            defaultValue={defaultName}
            maxLength={80}
            className="max-w-md"
          />
        )}
      </Field>

      <Field
        id="email"
        label="Email address"
        hint="Not used to send anything in this prototype. No email is ever delivered."
      >
        {(props) => (
          <TextInput
            {...props}
            name="email"
            type="email"
            autoComplete="email"
            className="max-w-md"
          />
        )}
      </Field>

      <Field
        id="studentIdNumber"
        label="Student ID"
        hint="Only if your professor asked for it. Do not enter a real ID into a prototype."
      >
        {(props) => (
          <TextInput
            {...props}
            name="studentIdNumber"
            autoComplete="off"
            className="max-w-56"
          />
        )}
      </Field>

      <Checkbox
        id="consent"
        name="consent"
        label="I understand this is a prototype, not a secure student-record system."
        hint="Your name, coursework activity and any notes you write are stored in a local prototype database. Do not enter anything you would not want in a demonstration."
      />

      <Button type="submit" disabled={pending}>
        {pending ? "Entering…" : "Enter course"}
      </Button>
    </form>
  );
}
