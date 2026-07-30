import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setSupportRequestStatusAction } from "@/app/professor/actions";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Meter,
  Notice,
  SectionHeading,
  Stat,
} from "@/components/ui/primitives";
import { Select } from "@/components/ui/form";
import { StatusPill } from "@/components/ui/status";
import {
  PRIORITY_LABELS,
  SUPPORT_PATHWAYS,
  SUPPORT_PATHWAY_DESCRIPTIONS,
  SUPPORT_PATHWAY_LABELS,
  SUPPORT_REQUEST_KIND_LABELS,
  SUPPORT_STATUS_LABELS,
  type SupportRequestKind,
} from "@/lib/domain/vocabulary";
import { formatDateTime, relativeTime } from "@/lib/format";
import { getCourse } from "@/lib/repositories/courses";
import { readinessForCourse } from "@/lib/repositories/readiness";
import { listRoster } from "@/lib/repositories/students";
import {
  listRecommendations,
  listSupportRequests,
  supportSummary,
} from "@/lib/repositories/support";
import { RespondForm } from "./support-forms";

export const metadata: Metadata = { title: "Support" };

const REQUEST_STATUSES = [
  "submitted",
  "acknowledged",
  "scheduled",
  "closed",
] as const;

export default async function SupportPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  if (!course) notFound();

  const roster = listRoster(courseId);
  const readiness = readinessForCourse(
    courseId,
    roster.map((student) => student.id),
  );
  const recommendations = listRecommendations(courseId);
  const requests = listSupportRequests(courseId);
  const summary = supportSummary(courseId);

  const byStudent = roster
    .map((student) => ({
      student,
      result: readiness.find((r) => r.studentId === student.id)!.result,
      recs: recommendations.filter((rec) => rec.student_id === student.id),
      reqs: requests.filter((req) => req.student_id === student.id),
    }))
    .filter((row) => row.recs.length > 0 || row.reqs.length > 0);

  const openRequests = requests.filter(
    (request) => request.status !== "closed",
  );
  const totals = {
    assigned: recommendations.length,
    completed: recommendations.filter((rec) => rec.status === "completed").length,
    declined: recommendations.filter((rec) => rec.status === "declined").length,
    accepted: recommendations.filter(
      (rec) => rec.status === "accepted" || rec.status === "in_progress",
    ).length,
  };

  return (
    <>
      <SectionHeading
        level={1}
        title="Support"
        description="What has been recommended, what students have done with it, and who is waiting on you."
      />

      <Notice tone="caution" title="No real scheduling happens here" className="mb-6">
        Requests create internal records. No email or SMS is sent, no calendar is
        booked, and no teaching assistant or tutoring service is notified. Follow up
        through your normal channels.
      </Notice>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Engagement with recommendations"
            description="Whether recommendations are actually being acted on — the thing worth knowing."
          />
          <CardBody className="space-y-5">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Assigned" value={totals.assigned} />
              <Stat
                label="Accepted or in progress"
                value={totals.accepted}
                tone="attention"
              />
              <Stat label="Completed" value={totals.completed} tone="track" />
              <Stat label="Declined" value={totals.declined} tone="unknown" />
            </dl>

            {summary.length > 0 ? (
              <div className="border-t border-sand-100 pt-5">
                <h3 className="mb-3 text-sm font-semibold">By pathway</h3>
                <ul className="space-y-3">
                  {summary.map((row) => (
                    <li key={row.pathway}>
                      <Meter
                        label={SUPPORT_PATHWAY_LABELS[row.pathway]}
                        value={row.completed}
                        max={Math.max(row.total, 1)}
                        valueText={`${row.completed} of ${row.total} completed · ${row.outstanding} outstanding`}
                        tone={
                          row.completed / Math.max(row.total, 1) >= 0.5
                            ? "track"
                            : "attention"
                        }
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Available pathways"
            description="What the recommender can suggest."
            level={3}
          />
          <CardBody>
            <dl className="space-y-3">
              {SUPPORT_PATHWAYS.map((pathway) => (
                <div key={pathway}>
                  <dt className="text-sm font-medium text-ink-800">
                    {SUPPORT_PATHWAY_LABELS[pathway]}
                  </dt>
                  <dd className="mt-0.5 text-[0.82rem] text-ink-500">
                    {SUPPORT_PATHWAY_DESCRIPTIONS[pathway]}
                  </dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>

      <section className="mt-8">
        <SectionHeading
          title="Requests"
          description={`${openRequests.length} open of ${requests.length} total.`}
        />
        {requests.length === 0 ? (
          <EmptyState
            title="No requests yet"
            description="Students submit requests from their support plan. Each one arrives with the topics they selected and a short preparation summary."
          />
        ) : (
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-sand-100">
                {requests.map((request) => (
                  <li key={request.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="burgundy">
                            {
                              SUPPORT_REQUEST_KIND_LABELS[
                                request.kind as SupportRequestKind
                              ]
                            }
                          </Badge>
                          <Badge
                            tone={
                              request.status === "closed"
                                ? "track"
                                : request.status === "submitted"
                                  ? "concern"
                                  : "attention"
                            }
                          >
                            {request.status}
                          </Badge>
                          <span className="text-[0.78rem] text-ink-400">
                            {relativeTime(request.created_at)}
                          </span>
                        </div>

                        <p className="mt-1.5 text-sm font-medium text-ink-800">
                          <Link
                            href={`/professor/courses/${courseId}/students/${request.student_id}`}
                          >
                            {request.student_name}
                          </Link>
                        </p>

                        {request.topics ? (
                          <p className="mt-1 text-[0.85rem] text-ink-600">
                            <span className="font-medium">Topics:</span>{" "}
                            {request.topics}
                          </p>
                        ) : null}
                        {request.preferred_time ? (
                          <p className="text-[0.85rem] text-ink-600">
                            <span className="font-medium">Availability:</span>{" "}
                            {request.preferred_time}
                          </p>
                        ) : null}
                        {request.message ? (
                          <p className="mt-1.5 rounded border border-sand-100 bg-cream-100 px-3 py-2 text-[0.85rem] leading-relaxed text-ink-600">
                            {request.message}
                          </p>
                        ) : null}
                        {request.prep_summary ? (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-[0.82rem] font-medium text-burgundy-700">
                              Preparation summary
                            </summary>
                            <p className="mt-1 whitespace-pre-line text-[0.82rem] text-ink-600">
                              {request.prep_summary}
                            </p>
                          </details>
                        ) : null}
                      </div>

                      <form
                        action={setSupportRequestStatusAction}
                        className="flex shrink-0 items-center gap-2"
                      >
                        <input type="hidden" name="courseId" value={courseId} />
                        <input
                          type="hidden"
                          name="requestId"
                          value={request.id}
                        />
                        <label
                          htmlFor={`req-status-${request.id}`}
                          className="sr-only"
                        >
                          Status for {request.student_name}&rsquo;s request
                        </label>
                        <Select
                          id={`req-status-${request.id}`}
                          name="status"
                          defaultValue={request.status}
                          className="w-auto py-1 text-[0.82rem]"
                        >
                          {REQUEST_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Select>
                        <Button type="submit" variant="secondary" size="sm">
                          Update
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </section>

      <section className="mt-8">
        <SectionHeading
          title="Support plans by student"
          description="Only students with something assigned or requested appear here."
        />
        {byStudent.length === 0 ? (
          <EmptyState
            title="No support plans assigned"
            description="Open a student from the roster to see the suggested plan and assign from it."
            action={
              <Link href={`/professor/courses/${courseId}/students`}>
                Go to the roster →
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {byStudent.map(({ student, result, recs }) => (
              <Card key={student.id}>
                <CardHeader
                  title={
                    <Link
                      href={`/professor/courses/${courseId}/students/${student.id}`}
                    >
                      {student.name}
                    </Link>
                  }
                  description={`${recs.filter((r) => r.status === "completed").length} of ${recs.length} completed`}
                  action={<StatusPill status={result.status} size="sm" />}
                />
                <CardBody className="p-0">
                  <ul className="divide-y divide-sand-100">
                    {recs.map((rec) => (
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
                          <span className="text-[0.78rem] text-ink-400">
                            {PRIORITY_LABELS[rec.priority]}
                            {rec.source === "professor" ? " · assigned by you" : ""}
                          </span>
                        </div>

                        <p className="mt-1.5 text-sm font-medium text-ink-800">
                          {rec.title}
                        </p>
                        <p className="mt-0.5 text-[0.82rem] text-ink-500">
                          {rec.rationale}
                        </p>
                        {rec.objective_code ? (
                          <p className="text-[0.8rem] text-ink-400">
                            {rec.objective_code}
                            {rec.lecture_title ? ` · ${rec.lecture_title}` : ""}
                            {rec.material_title ? ` · ${rec.material_title}` : ""}
                          </p>
                        ) : null}

                        {rec.student_response ? (
                          <p className="mt-1.5 rounded border border-sand-100 bg-cream-100 px-2 py-1 text-[0.82rem] text-ink-600">
                            Student: &ldquo;{rec.student_response}&rdquo;
                          </p>
                        ) : null}
                        {rec.completed_at ? (
                          <p className="mt-1 text-[0.78rem] text-track-600">
                            Marked complete {formatDateTime(rec.completed_at)}
                          </p>
                        ) : null}

                        {rec.professor_response ? (
                          <p className="mt-1.5 text-[0.82rem] text-ink-500">
                            <span className="font-medium">You:</span>{" "}
                            {rec.professor_response}
                          </p>
                        ) : (
                          <RespondForm
                            courseId={courseId}
                            recommendationId={rec.id}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
