"use client";

import { useActionState, useState } from "react";
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
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  PROFESSOR_ONLY_CONTENT_TYPES,
  URL_CONTENT_TYPES,
  VISIBILITIES,
  VISIBILITY_LABELS,
  type ContentType,
} from "@/lib/domain/vocabulary";
import {
  createMaterialAction,
} from "@/app/professor/actions";
import { emptyActionState } from "@/lib/forms/action-state";

export function MaterialForm({
  courseId,
  modules,
  objectives,
  concepts,
  defaultContentType,
}: {
  courseId: string;
  modules: { id: string; title: string; position: number }[];
  objectives: { id: string; code: string; text: string }[];
  concepts: { id: string; name: string }[];
  defaultContentType?: ContentType;
}) {
  const [state, action, pending] = useActionState(
    createMaterialAction,
    emptyActionState,
  );
  const [contentType, setContentType] = useState<ContentType>(
    defaultContentType ?? "reading_assignment",
  );

  const urlFirst = URL_CONTENT_TYPES.includes(contentType);
  const professorOnlyDefault = PROFESSOR_ONLY_CONTENT_TYPES.includes(contentType);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="courseId" value={courseId} />

      {state.error ? <Notice tone="caution">{state.error}</Notice> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="mat-title" label="Title" required className="sm:col-span-2">
          {(props) => <TextInput {...props} name="title" />}
        </Field>

        <Field id="mat-contentType" label="Content type" required>
          {(props) => (
            <Select
              {...props}
              name="contentType"
              value={contentType}
              onChange={(event) =>
                setContentType(event.target.value as ContentType)
              }
            >
              {CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CONTENT_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field id="mat-moduleId" label="Module">
          {(props) => (
            <Select {...props} name="moduleId">
              <option value="">Not assigned to a module</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.position}. {module.title}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          id="mat-description"
          label="Description"
          className="sm:col-span-2"
        >
          {(props) => <TextArea {...props} name="description" rows={2} />}
        </Field>

        <Field
          id="mat-url"
          label={urlFirst ? "Link" : "Link (if this material lives online)"}
          hint="YouTube, Vimeo, a live class link, or any external page."
          className="sm:col-span-2"
        >
          {(props) => (
            <TextInput
              {...props}
              name="url"
              type="url"
              placeholder="https://"
            />
          )}
        </Field>

        <Field
          id="mat-fileName"
          label="Filename"
          hint="Metadata only. File storage is not connected yet, so nothing is uploaded — the filename is recorded so you know what to bring to class."
          className="sm:col-span-2"
        >
          {(props) => (
            <TextInput {...props} name="fileName" placeholder="handout.pdf" />
          )}
        </Field>

        <Field id="mat-dateLabel" label="Date or week label">
          {(props) => (
            <TextInput {...props} name="dateLabel" placeholder="Week 3" />
          )}
        </Field>

        <Field id="mat-visibility" label="Visibility" required>
          {(props) => (
            <Select
              {...props}
              name="visibility"
              defaultValue={professorOnlyDefault ? "professor_only" : "students"}
              key={professorOnlyDefault ? "prof" : "students"}
            >
              {VISIBILITIES.map((visibility) => (
                <option key={visibility} value={visibility}>
                  {VISIBILITY_LABELS[visibility]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          id="mat-studentInstructions"
          label="Instructions for students"
          className="sm:col-span-2"
        >
          {(props) => (
            <TextArea
              {...props}
              name="studentInstructions"
              rows={2}
              placeholder="Read the whole treatise before Thursday."
            />
          )}
        </Field>

        <Field
          id="mat-professorNotes"
          label="Your own notes"
          hint="Never shown to students."
          className="sm:col-span-2"
        >
          {(props) => <TextArea {...props} name="professorNotes" rows={2} />}
        </Field>
      </div>

      {objectives.length > 0 ? (
        <fieldset>
          <legend className="text-sm font-medium text-ink-700">
            Related learning objectives
          </legend>
          <p className="mt-1 text-[0.82rem] text-ink-500">
            Tagging material to an objective is what lets the support recommender
            point a student at this exact resource.
          </p>
          <div className="mt-2 space-y-2">
            {objectives.map((objective) => (
              <Checkbox
                key={objective.id}
                id={`mat-obj-${objective.id}`}
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

      {concepts.length > 0 ? (
        <fieldset>
          <legend className="text-sm font-medium text-ink-700">
            Related concepts and exam topics
          </legend>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {concepts.map((concept) => (
              <Checkbox
                key={concept.id}
                id={`mat-cpt-${concept.id}`}
                name="conceptIds"
                value={concept.id}
                label={concept.name}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add material"}
        </Button>
        <FormStatus message={state.message} />
      </div>
    </form>
  );
}
