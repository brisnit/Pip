"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Notice } from "@/components/ui/primitives";
import { Field, FormStatus, TextArea, TextInput } from "@/components/ui/form";
import {
  answerQuestionAction,
  setCurrentTopicAction,
} from "@/app/professor/actions";
import { emptyActionState } from "@/lib/forms/action-state";

/**
 * Prototype live refresh.
 *
 * There is no realtime infrastructure here — no websockets, no server-sent
 * events. This polls the route on an interval and is honest about it in the UI.
 * Replacing this component with a subscription is the whole change needed later;
 * see docs/product-architecture.md → Live lecture mode.
 */
export function LivePoller({
  intervalSeconds = 15,
  enabled,
}: {
  intervalSeconds?: number;
  enabled: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => {
      router.refresh();
      setLastRefresh(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    }, intervalSeconds * 1000);
    return () => window.clearInterval(id);
  }, [on, intervalSeconds, router]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-tan-200 bg-paper-100 px-3 py-2 text-[0.82rem]">
      <span className="text-ink-600">
        Updates every {intervalSeconds}s.
      </span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOn((value) => !value)}
        aria-pressed={on}
      >
        {on ? "Pause auto-refresh" : "Resume auto-refresh"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          router.refresh();
          setLastRefresh(
            new Date().toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
            }),
          );
        }}
      >
        Refresh now
      </Button>
      <span role="status" aria-live="polite" className="text-ink-400">
        {lastRefresh ? `Last refreshed ${lastRefresh}` : ""}
      </span>
    </div>
  );
}

export function CurrentTopicForm({
  courseId,
  lectureId,
  currentTopic,
}: {
  courseId: string;
  lectureId: string;
  currentTopic: string | null;
}) {
  const [state, action, pending] = useActionState(
    setCurrentTopicAction,
    emptyActionState,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lectureId" value={lectureId} />
      <Field
        id="topic"
        label="Current topic"
        hint="Students see this at the top of the lecture page, so latecomers can find where you are."
        error={state.error}
        required
      >
        {(props) => (
          <TextInput
            {...props}
            name="topic"
            defaultValue={currentTopic ?? ""}
            placeholder="Imputed and infused righteousness"
          />
        )}
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sharing…" : "Share topic"}
        </Button>
        <FormStatus message={state.message} />
      </div>
    </form>
  );
}

export function AnswerQuestionForm({
  courseId,
  questionId,
}: {
  courseId: string;
  questionId: string;
}) {
  const [state, action, pending] = useActionState(
    answerQuestionAction,
    emptyActionState,
  );

  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="questionId" value={questionId} />
      <Field id={`answer-${questionId}`} label="Your answer" error={state.error}>
        {(props) => <TextArea {...props} name="body" rows={3} />}
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Posting…" : "Post answer"}
        </Button>
        <FormStatus message={state.message} />
      </div>
      {state.message ? null : null}
    </form>
  );
}

export function LiveDisclaimer() {
  return (
    <Notice tone="info" title="What a live session does">
      Starting a session opens the console and lets you publish moments to students
      as you go. Video is delivered by whichever provider you already use — the
      lecture links out to it.
    </Notice>
  );
}
