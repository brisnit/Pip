"use client";

import { useActionState } from "react";
import { Button, Card, CardBody, CardHeader, Notice } from "@/components/ui/primitives";
import { Field, Select, TextArea, TextInput } from "@/components/ui/form";
import {
  COURSE_FORMATS,
  COURSE_FORMAT_LABELS,
  COURSE_IMAGE_THEMES,
  COURSE_IMAGE_THEME_LABELS,
} from "@/lib/domain/vocabulary";
import {
  createCourseAction,
} from "@/app/professor/actions";
import { emptyActionState } from "@/lib/forms/action-state";

export function CourseForm() {
  const [state, action, pending] = useActionState(createCourseAction, emptyActionState);

  return (
    <form action={action} className="space-y-6">
      {state.error ? (
        <Notice tone="caution" title="This course was not created">
          {state.error}
        </Notice>
      ) : null}

      <Card>
        <CardHeader title="The basics" />
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Field
            id="title"
            label="Course title"
            required
            className="sm:col-span-2"
          >
            {(props) => (
              <TextInput
                {...props}
                name="title"
                placeholder="Theology and the Protestant Reformation"
              />
            )}
          </Field>

          <Field id="code" label="Course code" required>
            {(props) => (
              <TextInput {...props} name="code" placeholder="CH504" maxLength={20} />
            )}
          </Field>

          <Field id="term" label="Academic term">
            {(props) => (
              <TextInput {...props} name="term" placeholder="Summer 2026" />
            )}
          </Field>

          <Field
            id="description"
            label="Course description"
            hint="Shown to students on the join screen and the course home."
            className="sm:col-span-2"
          >
            {(props) => <TextArea {...props} name="description" rows={4} />}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="When and where" />
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Field id="format" label="Course format" required>
            {(props) => (
              <Select {...props} name="format" defaultValue="in_person">
                {COURSE_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {COURSE_FORMAT_LABELS[format]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field id="location" label="Location">
            {(props) => (
              <TextInput {...props} name="location" placeholder="Payton Hall 101" />
            )}
          </Field>

          <Field id="meetingDays" label="Meeting days">
            {(props) => (
              <TextInput
                {...props}
                name="meetingDays"
                placeholder="Tuesday, Thursday"
              />
            )}
          </Field>

          <Field id="meetingTime" label="Meeting time">
            {(props) => (
              <TextInput
                {...props}
                name="meetingTime"
                placeholder="9:00–11:20 a.m."
              />
            )}
          </Field>

          <Field id="startDate" label="Start date">
            {(props) => <TextInput {...props} name="startDate" type="date" />}
          </Field>

          <Field id="endDate" label="End date">
            {(props) => <TextInput {...props} name="endDate" type="date" />}
          </Field>

          <Field
            id="estimatedEnrollment"
            label="Estimated enrolment"
            hint="Used only to give context on the roster screen."
          >
            {(props) => (
              <TextInput
                {...props}
                name="estimatedEnrollment"
                type="number"
                min={0}
                max={2000}
                className="max-w-32"
              />
            )}
          </Field>

          <Field
            id="imageTheme"
            label="Course card colour"
            hint="No image upload in this prototype — courses use a colour theme instead."
          >
            {(props) => (
              <Select {...props} name="imageTheme" defaultValue="parchment">
                {COURSE_IMAGE_THEMES.map((theme) => (
                  <option key={theme} value={theme}>
                    {COURSE_IMAGE_THEME_LABELS[theme]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Structure"
          description="Optional now — you can also let the syllabus extraction draft these for you, or add them later."
        />
        <CardBody className="space-y-5">
          <Field
            id="objectives"
            label="Learning objectives"
            hint="One per line. These are what readiness is measured against, so they matter more than anything else on this form."
          >
            {(props) => (
              <TextArea
                {...props}
                name="objectives"
                rows={5}
                placeholder={
                  "Explain Luther's doctrine of justification and the exegetical arguments behind it\nDistinguish Lutheran and Reformed accounts of sacrament, law and covenant"
                }
              />
            )}
          </Field>

          <Field
            id="modules"
            label="Modules"
            hint="One per line, in teaching order."
          >
            {(props) => (
              <TextArea
                {...props}
                name="modules"
                rows={5}
                placeholder={
                  "Late Medieval Context\nMartin Luther and Justification\nReformed Theology"
                }
              />
            )}
          </Field>
        </CardBody>
      </Card>

      <Notice tone="info">
        Creating the course generates a six-character access code, a student join
        link, a QR code and a printable access card. You can rotate the code at any
        time from the course overview.
      </Notice>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating course…" : "Create course"}
        </Button>
      </div>
    </form>
  );
}
