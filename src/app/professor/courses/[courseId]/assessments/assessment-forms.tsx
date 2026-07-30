"use client";

import { useActionState } from "react";
import { Button, Notice } from "@/components/ui/primitives";
import {
  Checkbox,
  Field,
  FormStatus,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui/form";
import {
  ASSESSMENT_TYPES,
  ASSESSMENT_TYPE_LABELS,
  HUMAN_GRADED_ASSESSMENT_TYPES,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
} from "@/lib/domain/vocabulary";
import {
  createAssessmentAction,
  generateLectureQuestionsAction,
  generateStudyGuideAction,
} from "@/app/professor/actions";
import { emptyActionState } from "@/lib/forms/action-state";

const QUESTION_PLACEHOLDER = `Trent's Decree on Justification affirms that the righteousness by which we are justified is: || Infused, and genuinely present in the believer || Imputed, and remaining external || Both, without distinction
Luther held that the moral law has no continuing use for the justified Christian. || False || True
In two or three sentences, state what is theologically at stake in the difference between imputed and infused righteousness.`;

export function AssessmentForm({
  courseId,
  objectives,
  lectures,
}: {
  courseId: string;
  objectives: { id: string; code: string; text: string }[];
  lectures: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(
    createAssessmentAction,
    emptyActionState,
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="courseId" value={courseId} />

      {state.error ? <Notice tone="caution">{state.error}</Notice> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="asm-title" label="Title" required className="sm:col-span-2">
          {(props) => (
            <TextInput
              {...props}
              name="title"
              placeholder="Midterm Review: Luther and the Early Reformation"
            />
          )}
        </Field>

        <Field id="asm-type" label="Type" required>
          {(props) => (
            <Select {...props} name="type" defaultValue="quiz">
              {ASSESSMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ASSESSMENT_TYPE_LABELS[type]}
                  {HUMAN_GRADED_ASSESSMENT_TYPES.includes(type)
                    ? " (read by you)"
                    : ""}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field id="asm-scheduledAt" label="Date">
          {(props) => (
            <TextInput {...props} name="scheduledAt" type="datetime-local" />
          )}
        </Field>

        <Field
          id="asm-description"
          label="Description"
          className="sm:col-span-2"
        >
          {(props) => <TextArea {...props} name="description" rows={2} />}
        </Field>

        <Field id="asm-weightLabel" label="Weight or importance">
          {(props) => (
            <TextInput
              {...props}
              name="weightLabel"
              placeholder="25% of final grade"
            />
          )}
        </Field>

        <Field id="asm-studyResources" label="Study resources">
          {(props) => (
            <TextInput
              {...props}
              name="studyResources"
              placeholder="Study guide — modules 1–2"
            />
          )}
        </Field>

        <Field
          id="asm-professorGuidance"
          label="Your guidance to students"
          hint="Shown on the student assessment page."
          className="sm:col-span-2"
        >
          {(props) => <TextArea {...props} name="professorGuidance" rows={2} />}
        </Field>
      </div>

      <Checkbox
        id="asm-isPractice"
        name="isPractice"
        label="This is practice, not graded"
        hint="Practice results feed readiness and are shown to you in aggregate. Mark review sets as practice so students answer honestly."
      />

      {objectives.length > 0 ? (
        <fieldset>
          <legend className="text-sm font-medium text-ink-700">
            Related learning objectives
          </legend>
          <p className="mt-1 text-[0.82rem] text-ink-500">
            The first objective selected is what auto-scored answers are attributed
            to in the readiness model.
          </p>
          <div className="mt-2 space-y-2">
            {objectives.map((objective) => (
              <Checkbox
                key={objective.id}
                id={`asm-obj-${objective.id}`}
                name="objectiveIds"
                value={objective.id}
                label={
                  <>
                    <span className="font-medium">{objective.code}</span>{" "}
                    {objective.text}
                  </>
                }
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      {lectures.length > 0 ? (
        <fieldset>
          <legend className="text-sm font-medium text-ink-700">
            Related lectures
          </legend>
          <div className="mt-2 space-y-2">
            {lectures.map((lecture) => (
              <Checkbox
                key={lecture.id}
                id={`asm-lec-${lecture.id}`}
                name="lectureIds"
                value={lecture.id}
                label={lecture.title}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      <Field
        id="asm-questions"
        label="Questions"
        hint="One per line. Prompt || correct option || wrong option || wrong option. A line with no options becomes a short answer, stored for you to read and never auto-marked. Exactly “True || False” becomes a true/false question."
      >
        {(props) => (
          <TextArea
            {...props}
            name="questions"
            rows={7}
            className="font-mono text-[0.85rem]"
            placeholder={QUESTION_PLACEHOLDER}
          />
        )}
      </Field>

      <Notice tone="info">
        Question types supported:{" "}
        {QUESTION_TYPES.map((type) => QUESTION_TYPE_LABELS[type]).join(", ")}.
        Multiple choice and true/false are scored automatically. Nothing else is —
        essays and reflection papers are read by a person, and the application will
        not pretend otherwise.
      </Notice>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create assessment"}
        </Button>
        <FormStatus message={state.message} />
      </div>
    </form>
  );
}

export function GenerateQuestionsForm({
  courseId,
  lectures,
}: {
  courseId: string;
  lectures: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(
    generateLectureQuestionsAction,
    emptyActionState,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <Field
        id="gen-lectureId"
        label="Draft questions from a lecture"
        hint="Uses your section headings and key terms. Drafts are for your review — nothing is added to an assessment automatically."
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
          {pending ? "Drafting…" : "Draft questions"}
        </Button>
        <FormStatus
          message={state.error ?? state.message}
          tone={state.error ? "error" : "success"}
        />
      </div>
    </form>
  );
}

export function GenerateStudyGuideForm({
  courseId,
  assessments,
}: {
  courseId: string;
  assessments: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(
    generateStudyGuideAction,
    emptyActionState,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <Field
        id="gen-assessmentId"
        label="Draft a study guide"
        hint="Regroups your objectives and key terms around one assessment. No new content is invented."
      >
        {(props) => (
          <Select {...props} name="assessmentId">
            <option value="">Whole course</option>
            {assessments.map((assessment) => (
              <option key={assessment.id} value={assessment.id}>
                {assessment.title}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Drafting…" : "Draft study guide"}
        </Button>
        <FormStatus
          message={state.error ?? state.message}
          tone={state.error ? "error" : "success"}
        />
      </div>
    </form>
  );
}
