import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  clearStatusOverrideAction,
  setFollowUpAction,
} from "@/app/professor/actions";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DemoBadge,
  DetailList,
  Meter,
  Notice,
  SectionHeading,
  Stat,
} from "@/components/ui/primitives";
import {
  ConfidenceNote,
  ReasonList,
  StandingPill,
  StatusPill,
} from "@/components/ui/status";
import {
  MARKER_LABELS,
  NOTE_KIND_LABELS,
  PRIORITY_LABELS,
  QUESTION_KIND_LABELS,
  QUESTION_STATUS_LABELS,
  SUPPORT_PATHWAY_LABELS,
  SUPPORT_STATUS_LABELS,
} from "@/lib/domain/vocabulary";
import { formatClock } from "@/lib/domain/support";
import { formatDateTime, percent, relativeTime } from "@/lib/format";
import { listMaterials } from "@/lib/repositories/content";
import { getCourse, listObjectives } from "@/lib/repositories/courses";
import {
  listMarkers,
  listQuestions,
  listSharedNotes,
  listStudentActivity,
} from "@/lib/repositories/engagement";
import { listStudentLectures } from "@/lib/repositories/lectures";
import {
  listOverrideHistory,
  readinessFor,
} from "@/lib/repositories/readiness";
import { getStudent } from "@/lib/repositories/students";
import {
  draftRecommendations,
  listProfessorNotes,
  listRecommendations,
  listSupportRequests,
} from "@/lib/repositories/support";
import {
  AssignAllForm,
  AssignRecommendationForm,
  CustomRecommendationForm,
  ProfessorNoteForm,
  StatusOverrideForm,
} from "./student-forms";

type Props = {
  params: Promise<{ courseId: string; studentId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studentId } = await params;
  const student = getStudent(studentId);
  return { title: student ? student.name : "Student" };
}

export default async function StudentDetailPage({ params }: Props) {
  const { courseId, studentId } = await params;
  const course = getCourse(courseId);
  const student = getStudent(studentId);
  if (!course || !student) notFound();

  const readiness = readinessFor(courseId, studentId);
  const objectives = listObjectives(courseId);
  const lectures = listStudentLectures(courseId);
  const materials = listMaterials(courseId, { studentVisibleOnly: true });

  const questions = listQuestions(courseId, { studentId });
  const sharedNotes = listSharedNotes(courseId, studentId);
  const markers = listMarkers(studentId, courseId);
  const activity = listStudentActivity(courseId, studentId, 15);
  const notes = listProfessorNotes(courseId, studentId);
  const recommendations = listRecommendations(courseId, { studentId });
  const requests = listSupportRequests(courseId, { studentId });
  const overrideHistory = listOverrideHistory(courseId, studentId);

  const drafts = draftRecommendations(courseId, readiness);
  const assignedKeys = new Set(
    recommendations.map((rec) => `${rec.pathway}::${rec.title}`),
  );

  const confusingMarkers = markers.filter((m) => m.marker === "confusing");

  return (
    <>
      <p className="mb-2 text-[0.85rem]">
        <Link href={`/professor/courses/${courseId}/students`}>← Students</Link>
      </p>

      <SectionHeading
        level={1}
        title={student.name}
        description={`Joined ${relativeTime(student.created_at)} · last recorded activity ${relativeTime(readiness.lastActivityAt)}`}
        action={<StatusPill status={readiness.status} />}
      />

      <Notice tone="privacy" title="What this screen does and does not show" className="mb-6">
        Aggregated comprehension data, questions this student submitted, notes they
        explicitly shared, assessment responses and support requests. Their private
        notes are not shown here and are not retrievable through the professor
        portal.{" "}
        {student.is_demo === 1
          ? "This is a fictional demonstration student."
          : "Treat this as demonstration functionality — the prototype has no authentication."}
      </Notice>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Why this status"
            description="Every signal the readiness model used, with the observation behind it."
          />
          <CardBody className="space-y-5">
            {readiness.override ? (
              <Notice tone="info" title="Status set manually">
                <p>
                  {readiness.override.setByName} set this to{" "}
                  <StatusPill status={readiness.override.status} size="sm" /> on{" "}
                  {formatDateTime(readiness.override.createdAt)}.
                </p>
                <p className="mt-2">&ldquo;{readiness.override.reason}&rdquo;</p>
                <p className="mt-2 text-[0.85em]">
                  The computed status from the signals alone is{" "}
                  <StatusPill status={readiness.computedStatus} size="sm" />.
                </p>
                <form action={clearStatusOverrideAction} className="mt-3">
                  <input type="hidden" name="courseId" value={courseId} />
                  <input type="hidden" name="studentId" value={studentId} />
                  <Button type="submit" variant="secondary" size="sm">
                    Return to the computed status
                  </Button>
                </form>
              </Notice>
            ) : null}

            <ConfidenceNote confidence={readiness.confidence} />
            <ReasonList reasons={readiness.reasons} />

            <div className="border-t border-sand-100 pt-5">
              <h3 className="mb-3 text-sm font-semibold">Signals in detail</h3>
              <ul className="space-y-3">
                {readiness.signals.map((signal) => (
                  <li key={signal.kind}>
                    {signal.value !== null ? (
                      <Meter
                        label={`${signal.label}${
                          signal.weight === 0 ? " (context only)" : ""
                        }`}
                        value={signal.value}
                        valueText={percent(signal.value)}
                        tone={
                          signal.direction === "positive"
                            ? "track"
                            : signal.direction === "negative"
                              ? "concern"
                              : "unknown"
                        }
                      />
                    ) : (
                      <p className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-ink-700">
                          {signal.label}
                          {signal.weight === 0 ? " (context only)" : ""}
                        </span>
                        <span className="shrink-0 text-ink-400">
                          no data
                        </span>
                      </p>
                    )}
                    <p className="mt-1 text-[0.82rem] text-ink-500">
                      {signal.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Participation" level={3} />
            <CardBody>
              <dl className="grid grid-cols-2 gap-4">
                <Stat
                  label="Lectures worked in"
                  value={`${
                    readiness.signals.find(
                      (s) => s.kind === "participation_breadth",
                    )?.evidence ?? 0
                  } / ${lectures.length}`}
                />
                <Stat label="Questions submitted" value={questions.length} />
                <Stat label="Shared notes" value={sharedNotes.length} />
                <Stat
                  label="Marked confusing"
                  value={confusingMarkers.length}
                  tone={confusingMarkers.length > 2 ? "attention" : "neutral"}
                />
              </dl>
              <DetailList
                className="mt-5 grid-cols-1 border-t border-sand-100 pt-4 sm:grid-cols-1"
                items={[
                  { label: "Email", value: student.email },
                  { label: "Student ID", value: student.student_id_number },
                  {
                    label: "Record type",
                    value: student.is_demo === 1 ? <DemoBadge /> : "Prototype entry",
                  },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Change status"
              description="Overrides the computed status. An explanation is required."
              level={3}
            />
            <CardBody>
              <StatusOverrideForm
                courseId={courseId}
                studentId={studentId}
                currentStatus={readiness.status}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Learning-objective progress"
            description="Standing per objective, with the evidence behind it."
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-sand-100">
              {readiness.objectives.map((row) => (
                <li key={row.objective.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 text-sm">
                      <span className="font-medium text-burgundy-600">
                        {row.objective.code}
                      </span>{" "}
                      <span className="text-ink-700">{row.objective.text}</span>
                    </p>
                    <StandingPill standing={row.standing} />
                  </div>
                  <p className="mt-1 text-[0.8rem] text-ink-500">
                    {row.answered > 0
                      ? `${row.correct} of ${row.answered} related questions correct`
                      : "No related questions answered"}
                    {row.confusingMarkers > 0
                      ? ` · ${row.confusingMarkers} moment${
                          row.confusingMarkers === 1 ? "" : "s"
                        } marked confusing`
                      : ""}
                    {row.clearMarkers > 0
                      ? ` · ${row.clearMarkers} marked clear`
                      : ""}
                    {row.averageConfidence !== null
                      ? ` · confidence ${row.averageConfidence.toFixed(1)} / 5`
                      : ""}
                  </p>
                  {row.confusingConcepts.length > 0 ? (
                    <p className="mt-1 text-[0.8rem] text-attention-600">
                      Confusing: {row.confusingConcepts.join("; ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Questions submitted"
              description="Intentionally submitted by the student."
              level={3}
            />
            <CardBody className="p-0">
              {questions.length === 0 ? (
                <p className="px-5 py-4 text-sm text-ink-500">
                  This student has not submitted any questions.
                </p>
              ) : (
                <ul className="divide-y divide-sand-100">
                  {questions.map((question) => (
                    <li key={question.id} className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="burgundy">
                          {QUESTION_KIND_LABELS[question.kind]}
                        </Badge>
                        <Badge
                          tone={question.status === "open" ? "attention" : "track"}
                        >
                          {QUESTION_STATUS_LABELS[question.status]}
                        </Badge>
                        {question.at_seconds !== null ? (
                          <span className="font-mono text-[0.78rem] text-ink-400">
                            {formatClock(question.at_seconds)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-sm text-ink-700">{question.body}</p>
                      {question.segment_heading ? (
                        <p className="mt-1 text-[0.8rem] text-ink-400">
                          On &ldquo;{question.segment_heading}&rdquo; in{" "}
                          {question.lecture_title}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <p className="border-t border-sand-100 px-5 py-3 text-[0.82rem]">
                <Link href={`/professor/courses/${courseId}/insights`}>
                  Answer questions in the comprehension dashboard →
                </Link>
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Notes shared with you"
              description="Only notes the student explicitly chose to share."
              level={3}
            />
            <CardBody className="p-0">
              {sharedNotes.length === 0 ? (
                <p className="px-5 py-4 text-sm text-ink-500">
                  Nothing shared. The student may well have notes — they are
                  private, and this screen cannot read them.
                </p>
              ) : (
                <ul className="divide-y divide-sand-100">
                  {sharedNotes.map((note) => (
                    <li key={note.id} className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{NOTE_KIND_LABELS[note.kind]}</Badge>
                        {note.at_seconds !== null ? (
                          <span className="font-mono text-[0.78rem] text-ink-400">
                            {formatClock(note.at_seconds)}
                          </span>
                        ) : null}
                      </div>
                      {note.title ? (
                        <p className="mt-1.5 text-sm font-medium text-ink-800">
                          {note.title}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-600">
                        {note.body}
                      </p>
                      {note.segment_heading ? (
                        <p className="mt-1 text-[0.8rem] text-ink-400">
                          On &ldquo;{note.segment_heading}&rdquo;
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <section className="mt-8">
        <SectionHeading
          title="Support"
          description="What the recommender suggests, what has been assigned, and how the student has responded."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Suggested plan"
              description="Computed from this student's signals and your published course material."
            />
            <CardBody className="space-y-4">
              <AssignAllForm courseId={courseId} studentId={studentId} />
              <ul className="divide-y divide-sand-100 border-t border-sand-100">
                {drafts.map((draft, index) => {
                  const already = assignedKeys.has(
                    `${draft.pathway}::${draft.title}`,
                  );
                  return (
                    <li
                      key={`${draft.pathway}-${draft.title}`}
                      className="flex flex-wrap items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="burgundy">
                            {SUPPORT_PATHWAY_LABELS[draft.pathway]}
                          </Badge>
                          <Badge
                            tone={
                              draft.priority === "high"
                                ? "concern"
                                : draft.priority === "medium"
                                  ? "attention"
                                  : "neutral"
                            }
                          >
                            {PRIORITY_LABELS[draft.priority]}
                          </Badge>
                          {already ? (
                            <Badge tone="track">
                              <span aria-hidden="true">✓</span> Assigned
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-sm font-medium text-ink-800">
                          {draft.title}
                        </p>
                        <p className="mt-1 text-[0.82rem] text-ink-500">
                          {draft.rationale}
                        </p>
                        <p className="mt-1 text-[0.82rem] text-ink-600">
                          <span className="font-medium">Next step:</span>{" "}
                          {draft.nextStep}
                        </p>
                      </div>
                      {already ? null : (
                        <AssignRecommendationForm
                          courseId={courseId}
                          studentId={studentId}
                          index={index}
                          title={draft.title}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Assigned plan"
              description={`${recommendations.filter((r) => r.status === "completed").length} of ${recommendations.length} completed.`}
            />
            <CardBody className="p-0">
              {recommendations.length === 0 ? (
                <p className="px-5 py-4 text-sm text-ink-500">
                  Nothing assigned yet. Assign from the suggested plan, or write
                  your own below.
                </p>
              ) : (
                <ul className="divide-y divide-sand-100">
                  {recommendations.map((rec) => (
                    <li key={rec.id} className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="burgundy">
                          {SUPPORT_PATHWAY_LABELS[rec.pathway]}
                        </Badge>
                        <Badge
                          tone={
                            rec.status === "completed"
                              ? "track"
                              : rec.status === "declined"
                                ? "neutral"
                                : "attention"
                          }
                        >
                          {SUPPORT_STATUS_LABELS[rec.status]}
                        </Badge>
                        {rec.source === "professor" ? (
                          <span className="text-[0.78rem] text-ink-400">
                            assigned by you
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-ink-800">
                        {rec.title}
                      </p>
                      {rec.student_response ? (
                        <p className="mt-1 rounded border border-sand-100 bg-cream-100 px-2 py-1 text-[0.82rem] text-ink-600">
                          Student: &ldquo;{rec.student_response}&rdquo;
                        </p>
                      ) : null}
                      {rec.professor_response ? (
                        <p className="mt-1 text-[0.82rem] text-ink-500">
                          You: {rec.professor_response}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              {requests.length > 0 ? (
                <div className="border-t border-sand-100 px-5 py-4">
                  <h3 className="text-sm font-semibold">Requests submitted</h3>
                  <ul className="mt-2 space-y-2">
                    {requests.map((request) => (
                      <li key={request.id} className="text-[0.85rem]">
                        <span className="font-medium text-ink-800">
                          {request.kind.replace(/_/g, " ")}
                        </span>{" "}
                        <span className="text-ink-400">({request.status})</span>
                        {request.topics ? (
                          <span className="block text-ink-500">
                            {request.topics}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[0.82rem]">
                    <Link href={`/professor/courses/${courseId}/support`}>
                      Manage requests →
                    </Link>
                  </p>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader
            title="Write your own recommendation"
            description="For anything the recommender cannot see — a conversation after class, a reading you know will land."
          />
          <CardBody>
            <CustomRecommendationForm
              courseId={courseId}
              studentId={studentId}
              objectives={objectives}
              lectures={lectures.map((lecture) => ({
                id: lecture.id,
                title: lecture.title,
              }))}
              materials={materials.map((material) => ({
                id: material.id,
                title: material.title,
              }))}
            />
          </CardBody>
        </Card>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Your notes and follow-up"
            description="Private to you. Not visible to the student."
          />
          <CardBody className="space-y-5">
            <ProfessorNoteForm courseId={courseId} studentId={studentId} />
            {notes.length > 0 ? (
              <ul className="divide-y divide-sand-100 border-t border-sand-100">
                {notes.map((note) => (
                  <li key={note.id} className="py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.85rem] leading-relaxed text-ink-700">
                          {note.body}
                        </p>
                        <p className="mt-1 text-[0.78rem] text-ink-400">
                          {formatDateTime(note.created_at)} ·{" "}
                          {note.follow_up_status === "open"
                            ? "follow-up open"
                            : "follow-up complete"}
                        </p>
                      </div>
                      <form action={setFollowUpAction} className="shrink-0">
                        <input type="hidden" name="courseId" value={courseId} />
                        <input type="hidden" name="studentId" value={studentId} />
                        <input type="hidden" name="noteId" value={note.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={note.follow_up_status === "open" ? "complete" : "open"}
                        />
                        <Button type="submit" variant="ghost" size="sm">
                          {note.follow_up_status === "open"
                            ? "Mark complete"
                            : "Reopen"}
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Recent activity" level={3} />
            <CardBody className="p-0">
              {activity.length === 0 ? (
                <p className="px-5 py-4 text-sm text-ink-500">
                  No recorded activity.
                </p>
              ) : (
                <ul className="divide-y divide-sand-100">
                  {activity.map((event) => (
                    <li key={event.id} className="px-5 py-2.5">
                      <p className="text-[0.85rem] text-ink-700">
                        {event.summary}
                      </p>
                      <p className="text-[0.78rem] text-ink-400">
                        {relativeTime(event.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Confusion markers" level={3} />
            <CardBody className="p-0">
              {confusingMarkers.length === 0 ? (
                <p className="px-5 py-4 text-sm text-ink-500">
                  Nothing marked confusing.
                </p>
              ) : (
                <ul className="divide-y divide-sand-100">
                  {confusingMarkers.map((marker) => (
                    <li key={marker.id} className="px-5 py-2.5">
                      <p className="text-[0.85rem] text-ink-700">
                        {MARKER_LABELS[marker.marker]}
                        {marker.at_seconds !== null
                          ? ` at ${formatClock(marker.at_seconds)}`
                          : ""}
                      </p>
                      {marker.transcript_excerpt ? (
                        <p className="mt-0.5 text-[0.8rem] italic text-ink-500">
                          &ldquo;{marker.transcript_excerpt}&rdquo;
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {overrideHistory.length > 0 ? (
            <Card>
              <CardHeader title="Status history" level={3} />
              <CardBody className="p-0">
                <ul className="divide-y divide-sand-100">
                  {overrideHistory.map((entry) => (
                    <li key={entry.id} className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <StatusPill status={entry.status} size="sm" />
                        {entry.cleared_at ? (
                          <span className="text-[0.78rem] text-ink-400">
                            cleared
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[0.82rem] text-ink-600">
                        {entry.reason}
                      </p>
                      <p className="text-[0.78rem] text-ink-400">
                        {entry.professor_name} ·{" "}
                        {formatDateTime(entry.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
