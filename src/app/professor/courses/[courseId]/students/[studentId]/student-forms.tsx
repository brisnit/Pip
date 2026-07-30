"use client";

import { useActionState } from "react";
import { Button, Notice } from "@/components/ui/primitives";
import {
  Field,
  FormStatus,
  RadioGroup,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui/form";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  READINESS_PRESENTATION,
  READINESS_STATUSES,
  SUPPORT_PATHWAYS,
  SUPPORT_PATHWAY_LABELS,
} from "@/lib/domain/vocabulary";
import {
  assignRecommendationAction,
  createCustomRecommendationAction,
  createProfessorNoteAction,
  setStatusOverrideAction,
  syncRecommendationsAction,
} from "@/app/professor/actions";
import { emptyActionState } from "@/lib/forms/action-state";

export function StatusOverrideForm({
  courseId,
  studentId,
  currentStatus,
}: {
  courseId: string;
  studentId: string;
  currentStatus: string;
}) {
  const [state, action, pending] = useActionState(
    setStatusOverrideAction,
    emptyActionState,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="studentId" value={studentId} />

      <RadioGroup
        name="status"
        legend="Set status manually"
        hint="Your judgement overrides the computed status wherever it appears — including for the student."
        defaultValue={currentStatus}
        options={READINESS_STATUSES.map((status) => ({
          value: status,
          label: READINESS_PRESENTATION[status].label,
          description: READINESS_PRESENTATION[status].professorSentence,
        }))}
      />

      <Field
        id="override-reason"
        label="Why"
        hint="Required. Shown alongside the status, so write it as something the student could read."
        error={state.error}
        required
      >
        {(props) => (
          <TextArea
            {...props}
            name="reason"
            rows={3}
            placeholder="Spoke after class — the gap is a prior framework rather than inattention. Reassessing after the practice review."
          />
        )}
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Set status"}
        </Button>
        <FormStatus message={state.message} />
      </div>
    </form>
  );
}

export function ProfessorNoteForm({
  courseId,
  studentId,
}: {
  courseId: string;
  studentId: string;
}) {
  const [state, action, pending] = useActionState(
    createProfessorNoteAction,
    emptyActionState,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="studentId" value={studentId} />
      <Field
        id="note-body"
        label="Add a note"
        hint="Visible to you, not to the student. Notes track follow-up so a conversation does not get lost between weeks."
        error={state.error}
      >
        {(props) => <TextArea {...props} name="body" rows={3} />}
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save note"}
        </Button>
        <FormStatus message={state.message} />
      </div>
    </form>
  );
}

export function AssignRecommendationForm({
  courseId,
  studentId,
  index,
  title,
}: {
  courseId: string;
  studentId: string;
  index: number;
  title: string;
}) {
  const [state, action, pending] = useActionState(
    assignRecommendationAction,
    emptyActionState,
  );

  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="index" value={index} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Assigning…" : "Assign"}
        <span className="sr-only"> {title}</span>
      </Button>
      <FormStatus
        message={state.error ?? state.message}
        tone={state.error ? "error" : "success"}
      />
    </form>
  );
}

export function AssignAllForm({
  courseId,
  studentId,
}: {
  courseId: string;
  studentId: string;
}) {
  const [state, action, pending] = useActionState(
    syncRecommendationsAction,
    emptyActionState,
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="studentId" value={studentId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Assigning…" : "Assign the whole suggested plan"}
      </Button>
      <FormStatus
        message={state.error ?? state.message}
        tone={state.error ? "error" : "success"}
      />
    </form>
  );
}

export function CustomRecommendationForm({
  courseId,
  studentId,
  objectives,
  lectures,
  materials,
}: {
  courseId: string;
  studentId: string;
  objectives: { id: string; code: string; text: string }[];
  lectures: { id: string; title: string }[];
  materials: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(
    createCustomRecommendationAction,
    emptyActionState,
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="studentId" value={studentId} />

      {state.error ? <Notice tone="caution">{state.error}</Notice> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="rec-pathway" label="Pathway" required>
          {(props) => (
            <Select {...props} name="pathway" defaultValue="curriculum">
              {SUPPORT_PATHWAYS.map((pathway) => (
                <option key={pathway} value={pathway}>
                  {SUPPORT_PATHWAY_LABELS[pathway]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field id="rec-priority" label="Priority" required>
          {(props) => (
            <Select {...props} name="priority" defaultValue="medium">
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field id="rec-title" label="Title" required className="sm:col-span-2">
          {(props) => (
            <TextInput
              {...props}
              name="title"
              placeholder="Re-read the second half of The Freedom of a Christian"
            />
          )}
        </Field>

        <Field
          id="rec-rationale"
          label="Why you are recommending it"
          hint="The student reads this. Describe the evidence, not the person."
          required
          className="sm:col-span-2"
        >
          {(props) => <TextArea {...props} name="rationale" rows={2} />}
        </Field>

        <Field
          id="rec-nextStep"
          label="The concrete next step"
          required
          className="sm:col-span-2"
        >
          {(props) => <TextArea {...props} name="nextStep" rows={2} />}
        </Field>

        <Field id="rec-objectiveId" label="Related objective">
          {(props) => (
            <Select {...props} name="objectiveId">
              <option value="">None</option>
              {objectives.map((objective) => (
                <option key={objective.id} value={objective.id}>
                  {objective.code} — {objective.text.slice(0, 60)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field id="rec-lectureId" label="Related lecture">
          {(props) => (
            <Select {...props} name="lectureId">
              <option value="">None</option>
              {lectures.map((lecture) => (
                <option key={lecture.id} value={lecture.id}>
                  {lecture.title}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          id="rec-materialId"
          label="Related material"
          className="sm:col-span-2"
        >
          {(props) => (
            <Select {...props} name="materialId">
              <option value="">None</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add to support plan"}
        </Button>
        <FormStatus message={state.message} />
      </div>
    </form>
  );
}
