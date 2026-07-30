"use client";

import { useActionState } from "react";
import { Button, Card, CardBody, CardHeader, Notice } from "@/components/ui/primitives";
import { Checkbox, Field, Select, TextArea, TextInput } from "@/components/ui/form";
import {
  DELIVERY_MODES,
  DELIVERY_MODE_LABELS,
  LECTURE_STATUSES,
  LECTURE_STATUS_LABELS,
} from "@/lib/domain/vocabulary";
import {
  createLectureAction,
} from "@/app/professor/actions";
import { emptyActionState } from "@/lib/forms/action-state";

const SEGMENT_PLACEHOLDER = `0:00 | Where we left off: the penitential system | Recall the pressure point from week 1.
6:30 | The early lectures on Romans | Watch the phrase iustitia Dei shift.
14:10 | The Heidelberg Disputation, 1518 | Theses 19–24 on the theology of the cross.`;

const QUESTION_PLACEHOLDER = `In Luther's mature account, the righteousness by which a sinner is justified is best described as: || Imputed to the believer, remaining Christ's own || Infused as a habit that perfects the will || A potential actualised through penance
Simul iustus et peccator is best rendered as: || At the same time righteous and a sinner || Righteous in part and sinful in part || Once a sinner, now righteous`;

export function LectureForm({
  courseId,
  modules,
  objectives,
}: {
  courseId: string;
  modules: { id: string; title: string; position: number }[];
  objectives: { id: string; code: string; text: string }[];
}) {
  const [state, action, pending] = useActionState(createLectureAction, emptyActionState);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="courseId" value={courseId} />

      {state.error ? (
        <Notice tone="caution" title="This lecture was not saved">
          {state.error}
        </Notice>
      ) : null}

      <Card>
        <CardHeader title="The lecture" />
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Field id="lec-title" label="Lecture title" required className="sm:col-span-2">
            {(props) => (
              <TextInput
                {...props}
                name="title"
                placeholder="Martin Luther and the Doctrine of Justification"
              />
            )}
          </Field>

          <Field
            id="lec-description"
            label="Description"
            className="sm:col-span-2"
          >
            {(props) => <TextArea {...props} name="description" rows={2} />}
          </Field>

          <Field id="lec-moduleId" label="Module">
            {(props) => (
              <Select {...props} name="moduleId">
                <option value="">Not assigned</option>
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.position}. {module.title}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field id="lec-scheduledAt" label="Date and time">
            {(props) => (
              <TextInput {...props} name="scheduledAt" type="datetime-local" />
            )}
          </Field>

          <Field id="lec-deliveryMode" label="Live or recorded" required>
            {(props) => (
              <Select {...props} name="deliveryMode" defaultValue="recorded">
                {DELIVERY_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {DELIVERY_MODE_LABELS[mode]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            id="lec-status"
            label="Status"
            hint="Drafts are invisible to students."
            required
          >
            {(props) => (
              <Select {...props} name="status" defaultValue="published">
                {LECTURE_STATUSES.filter((status) => status !== "ended").map(
                  (status) => (
                    <option key={status} value={status}>
                      {LECTURE_STATUS_LABELS[status]}
                    </option>
                  ),
                )}
              </Select>
            )}
          </Field>

          <Field id="lec-durationMinutes" label="Duration in minutes">
            {(props) => (
              <TextInput
                {...props}
                name="durationMinutes"
                type="number"
                min={1}
                max={600}
                className="max-w-28"
              />
            )}
          </Field>

          <Field
            id="lec-videoUrl"
            label="Recording link"
            hint="YouTube, Vimeo or any direct link. Video is embedded or linked, not hosted here."
            className="sm:col-span-2"
          >
            {(props) => (
              <TextInput
                {...props}
                name="videoUrl"
                type="url"
                placeholder="https://www.youtube.com/watch?v=…"
              />
            )}
          </Field>

          <Field
            id="lec-liveUrl"
            label="Live stream link"
            hint="Whatever your institution already uses for live class."
            className="sm:col-span-2"
          >
            {(props) => (
              <TextInput {...props} name="liveUrl" type="url" placeholder="https://" />
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Outline"
          description="One section per line: timestamp | heading | optional body. Sections are what students anchor notes, markers and questions to — they carry most of the value in the student experience."
        />
        <CardBody>
          <Field id="lec-segments" label="Sections">
            {(props) => (
              <TextArea
                {...props}
                name="segments"
                rows={8}
                className="font-mono text-[0.85rem]"
                placeholder={SEGMENT_PLACEHOLDER}
              />
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Notes and transcript"
          description="Teaching notes stay with you. Student notes and the transcript appear alongside the lecture."
        />
        <CardBody className="space-y-5">
          <Field
            id="lec-teachingNotes"
            label="Teaching notes"
            hint="Never shown to students. Timing reminders, known sticking points, what to compress."
          >
            {(props) => <TextArea {...props} name="teachingNotes" rows={5} />}
          </Field>

          <Field
            id="lec-studentNotes"
            label="Student-facing notes"
            hint="Markdown-style headings, bold and lists are rendered."
          >
            {(props) => <TextArea {...props} name="studentNotes" rows={8} />}
          </Field>

          <Field
            id="lec-transcriptText"
            label="Transcript"
            hint="Paste a transcript to give students a searchable, readable version alongside the recording. Lines beginning [mm:ss] are shown as timestamps."
          >
            {(props) => <TextArea {...props} name="transcriptText" rows={8} />}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Theology and scripture"
          description="Key terms and passages. Students see these as definitions and references inside the lecture."
        />
        <CardBody className="space-y-5">
          <Field
            id="lec-concepts"
            label="Key theological terms"
            hint="One per line: term | definition."
          >
            {(props) => (
              <TextArea
                {...props}
                name="concepts"
                rows={4}
                className="font-mono text-[0.85rem]"
                placeholder={
                  "Imputed righteousness | Reckoned to the believer's account, remaining Christ's own.\nSimul iustus et peccator | At the same time righteous and a sinner."
                }
              />
            )}
          </Field>

          <Field
            id="lec-scripture"
            label="Scripture references"
            hint="One per line: reference | optional note."
          >
            {(props) => (
              <TextArea
                {...props}
                name="scripture"
                rows={3}
                className="font-mono text-[0.85rem]"
                placeholder={
                  "Romans 1:16–17 | The iustitia Dei passage.\nGalatians 2:15–21 | Read with the 1535 commentary alongside."
                }
              />
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Learning objectives"
          description="Which objectives this lecture is teaching toward. This is how comprehension answers become readiness signals — a lecture with no objective produces no per-objective evidence."
        />
        <CardBody>
          {objectives.length === 0 ? (
            <Notice tone="caution">
              This course has no learning objectives yet. Add them on the course
              overview or publish them from the syllabus first, otherwise
              comprehension answers cannot be attributed to anything.
            </Notice>
          ) : (
            <div className="space-y-2">
              {objectives.map((objective) => (
                <Checkbox
                  key={objective.id}
                  id={`lec-obj-${objective.id}`}
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
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Comprehension questions"
          description="One per line: prompt || correct option || wrong option || wrong option. The first option is the correct one. These are attributed to the first objective you selected above."
        />
        <CardBody>
          <Field id="lec-questions" label="Questions">
            {(props) => (
              <TextArea
                {...props}
                name="questions"
                rows={6}
                className="font-mono text-[0.85rem]"
                placeholder={QUESTION_PLACEHOLDER}
              />
            )}
          </Field>
          <p className="mt-3 text-[0.82rem] text-ink-500">
            You can add the other interactive moment types — reflection prompts,
            polls, definitions, exam emphasis, confidence ratings — from the live
            console once the lecture exists.
          </p>
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving lecture…" : "Save lecture"}
        </Button>
      </div>
    </form>
  );
}
