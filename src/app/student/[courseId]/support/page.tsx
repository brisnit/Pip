import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { product } from "@/config/product";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Meter,
  Notice,
  SectionHeading,
} from "@/components/ui/primitives";
import { StatusPill } from "@/components/ui/status";
import {
  PRIORITY_LABELS,
  SUPPORT_PATHWAY_DESCRIPTIONS,
  SUPPORT_PATHWAY_LABELS,
  SUPPORT_REQUEST_KIND_LABELS,
  SUPPORT_STATUS_LABELS,
  type SupportPathway,
  type SupportRequestKind,
} from "@/lib/domain/vocabulary";
import { formatDateTime, relativeTime } from "@/lib/format";
import { getCourse } from "@/lib/repositories/courses";
import { readinessFor } from "@/lib/repositories/readiness";
import {
  draftRecommendations,
  listRecommendations,
  listSupportRequests,
} from "@/lib/repositories/support";
import { currentStudentInCourse } from "@/lib/role/role-context";
import {
  RecommendationResponseForm,
  SupportRequestForm,
} from "./support-forms";

export const metadata: Metadata = { title: "Support plan" };

/** Which request kind a pathway maps onto, for the inline request form. */
const PATHWAY_REQUEST_KIND: Partial<Record<SupportPathway, SupportRequestKind>> = {
  teaching_assistant: "teaching_assistant",
  tutoring: "tutoring",
  office_hours: "office_hours",
  peer_study: "peer_study",
};

export default async function StudentSupportPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  const student = await currentStudentInCourse(courseId);
  if (!course || !student) notFound();

  const readiness = readinessFor(courseId, student.studentId);
  const assigned = listRecommendations(courseId, {
    studentId: student.studentId,
  });
  const requests = listSupportRequests(courseId, {
    studentId: student.studentId,
  });

  // Anything the model currently suggests that is not already on the plan.
  const assignedKeys = new Set(
    assigned.map((rec) => `${rec.pathway}::${rec.title}`),
  );
  const suggested = draftRecommendations(courseId, readiness).filter(
    (draft) => !assignedKeys.has(`${draft.pathway}::${draft.title}`),
  );

  const active = assigned.filter(
    (rec) => rec.status !== "completed" && rec.status !== "declined",
  );
  const finished = assigned.filter(
    (rec) => rec.status === "completed" || rec.status === "declined",
  );

  const gapTopics = readiness.gaps
    .flatMap((gap) =>
      gap.confusingConcepts.length > 0
        ? gap.confusingConcepts
        : [gap.objective.text],
    )
    .slice(0, 3)
    .join("; ");

  return (
    <>
      <SectionHeading
        level={1}
        title="Your support plan"
        description="Concrete next steps, each one saying why it is here. Take what helps and say so when something does not."
        action={<StatusPill status={readiness.status} />}
      />

      {assigned.length > 0 ? (
        <Card className="mb-6">
          <CardBody>
            <Meter
              label="Steps completed"
              value={assigned.filter((rec) => rec.status === "completed").length}
              max={Math.max(assigned.length, 1)}
              valueText={`${assigned.filter((rec) => rec.status === "completed").length} of ${assigned.length}`}
              tone="track"
            />
            <p className="mt-2 text-[0.82rem] text-ink-500">
              Your professor can see whether you have engaged with these — not what
              you wrote in your private notes.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {active.length > 0 ? (
        <section className="mb-8">
          <SectionHeading title="Your recommended support plan" level={2} />
          <ol className="space-y-4">
            {active.map((rec, index) => (
              <Card as="li" key={rec.id}>
                <CardBody>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="font-serif text-lg text-gold-400"
                        >
                          {index + 1}
                        </span>
                        <Badge tone="burgundy">
                          {SUPPORT_PATHWAY_LABELS[rec.pathway]}
                        </Badge>
                        <Badge
                          tone={
                            rec.priority === "high"
                              ? "concern"
                              : rec.priority === "medium"
                                ? "attention"
                                : "neutral"
                          }
                        >
                          {PRIORITY_LABELS[rec.priority]}
                        </Badge>
                        <Badge>{SUPPORT_STATUS_LABELS[rec.status]}</Badge>
                        {rec.source === "professor" ? (
                          <span className="text-[0.75rem] text-ink-400">
                            from {course.professor_name}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-2 font-serif text-lg leading-snug">
                        {rec.title}
                      </h3>

                      <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink-600">
                        <span className="font-medium text-ink-700">
                          Why this is here:
                        </span>{" "}
                        {rec.rationale}
                      </p>

                      <p className="mt-2 rounded border border-sand-100 bg-cream-100 px-3 py-2 text-[0.9rem] leading-relaxed text-ink-700">
                        <span className="font-medium">Next step:</span>{" "}
                        {rec.next_step}
                      </p>

                      {rec.objective_text ? (
                        <p className="mt-2 text-[0.8rem] text-ink-400">
                          Objective: {rec.objective_text}
                          {rec.concept_name ? ` · ${rec.concept_name}` : ""}
                        </p>
                      ) : null}

                      {rec.lecture_id ? (
                        <p className="mt-1.5 text-[0.85rem]">
                          <Link
                            href={`/student/${courseId}/lecture/${rec.lecture_id}`}
                          >
                            Open {rec.lecture_title ?? "the lecture"} →
                          </Link>
                        </p>
                      ) : null}
                      {rec.material_title ? (
                        <p className="mt-1 text-[0.85rem]">
                          <Link href={`/student/${courseId}/resources`}>
                            Find &ldquo;{rec.material_title}&rdquo; in resources →
                          </Link>
                        </p>
                      ) : null}

                      {rec.professor_response ? (
                        <p className="mt-2 rounded-md border border-track-200 bg-track-50 px-3 py-2 text-[0.85rem] text-ink-700">
                          <span className="font-semibold">
                            {course.professor_name}:
                          </span>{" "}
                          {rec.professor_response}
                        </p>
                      ) : null}

                      {rec.student_response ? (
                        <p className="mt-2 text-[0.82rem] text-ink-500">
                          You said: &ldquo;{rec.student_response}&rdquo;
                        </p>
                      ) : null}

                      <RecommendationResponseForm
                        courseId={courseId}
                        recommendationId={rec.id}
                        status={rec.status}
                      />

                      {PATHWAY_REQUEST_KIND[rec.pathway] ? (
                        <details className="mt-3 border-t border-sand-100 pt-3">
                          <summary className="cursor-pointer text-sm font-medium text-burgundy-700">
                            Request this
                          </summary>
                          <div className="mt-3">
                            <SupportRequestForm
                              courseId={courseId}
                              recommendationId={rec.id}
                              defaultKind={PATHWAY_REQUEST_KIND[rec.pathway]}
                              defaultTopics={
                                rec.objective_text ?? rec.concept_name ?? gapTopics
                              }
                              taName={product.support.taName}
                              professorName={course.professor_name}
                              tutoringCenterName={
                                product.support.tutoringCenterName
                              }
                            />
                          </div>
                        </details>
                      ) : null}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </ol>
        </section>
      ) : null}

      {suggested.length > 0 ? (
        <section className="mb-8">
          <SectionHeading
            title={
              active.length > 0
                ? "Also suggested for you"
                : "Suggested for you"
            }
            level={2}
            description="Computed from your recorded activity and your professor's published material. Nothing here has been assigned yet."
          />
          <ul className="space-y-3">
            {suggested.map((draft) => (
              <Card as="li" key={`${draft.pathway}-${draft.title}`}>
                <CardBody className="p-4">
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
                  </div>
                  <h3 className="mt-1.5 text-[0.98rem] font-semibold">
                    {draft.title}
                  </h3>
                  <p className="mt-1 text-[0.85rem] text-ink-600">
                    <span className="font-medium text-ink-700">
                      Why this is here:
                    </span>{" "}
                    {draft.rationale}
                  </p>
                  <p className="mt-1.5 text-[0.88rem] text-ink-700">
                    <span className="font-medium">Next step:</span>{" "}
                    {draft.nextStep}
                  </p>
                  {draft.lectureId ? (
                    <p className="mt-1.5 text-[0.85rem]">
                      <Link
                        href={`/student/${courseId}/lecture/${draft.lectureId}`}
                      >
                        Open the lecture →
                      </Link>
                    </p>
                  ) : null}
                </CardBody>
              </Card>
            ))}
          </ul>
        </section>
      ) : null}

      {assigned.length === 0 && suggested.length === 0 ? (
        <EmptyState
          title="Nothing recommended yet"
          description="Work through a lecture and answer a few comprehension checks. Recommendations are built from what you actually record, so there is nothing useful to suggest until then."
        />
      ) : null}

      <section className="mb-8">
        <SectionHeading
          title="Ask for help directly"
          level={2}
          description="You do not need a recommendation to ask. A direct request always takes priority over anything the model computed."
        />
        <Card>
          <CardBody>
            <SupportRequestForm
              courseId={courseId}
              defaultTopics={gapTopics}
              taName={product.support.taName}
              professorName={course.professor_name}
              tutoringCenterName={product.support.tutoringCenterName}
            />
          </CardBody>
        </Card>
      </section>

      {requests.length > 0 ? (
        <section className="mb-8">
          <SectionHeading title="Your requests" level={2} />
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-sand-100">
                {requests.map((request) => (
                  <li key={request.id} className="px-5 py-4">
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
                              ? "attention"
                              : "neutral"
                        }
                      >
                        {request.status}
                      </Badge>
                      <span className="text-[0.78rem] text-ink-400">
                        {relativeTime(request.created_at)}
                      </span>
                    </div>
                    {request.topics ? (
                      <p className="mt-1.5 text-[0.88rem] text-ink-700">
                        <span className="font-medium">Topics:</span>{" "}
                        {request.topics}
                      </p>
                    ) : null}
                    {request.preferred_time ? (
                      <p className="text-[0.85rem] text-ink-500">
                        You said you are free: {request.preferred_time}
                      </p>
                    ) : null}
                    {request.prep_summary ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[0.85rem] font-medium text-burgundy-700">
                          Your preparation summary
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap rounded border border-sand-100 bg-cream-100 px-3 py-2 font-sans text-[0.85rem] leading-relaxed text-ink-600">
                          {request.prep_summary}
                        </pre>
                        <p className="mt-1.5 text-[0.78rem] text-ink-400">
                          Built from the topics you selected and your recorded
                          activity. Your private notes were not used.
                        </p>
                      </details>
                    ) : null}
                    <p className="mt-2 text-[0.78rem] text-ink-400">
                      Submitted {formatDateTime(request.created_at)}. No email or
                      calendar invitation was sent — this prototype records the
                      request for your professor to see.
                    </p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </section>
      ) : null}

      {finished.length > 0 ? (
        <section className="mb-8">
          <SectionHeading title="Done and declined" level={2} />
          <Card>
            <CardBody className="p-0">
              <ul className="divide-y divide-sand-100">
                {finished.map((rec) => (
                  <li key={rec.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={rec.status === "completed" ? "track" : "neutral"}
                      >
                        {SUPPORT_STATUS_LABELS[rec.status]}
                      </Badge>
                      <Badge tone="burgundy">
                        {SUPPORT_PATHWAY_LABELS[rec.pathway]}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-[0.9rem] text-ink-700">
                      {rec.title}
                    </p>
                    {rec.student_response ? (
                      <p className="mt-0.5 text-[0.82rem] text-ink-500">
                        You said: &ldquo;{rec.student_response}&rdquo;
                      </p>
                    ) : null}
                    <RecommendationResponseForm
                      courseId={courseId}
                      recommendationId={rec.id}
                      status={rec.status}
                    />
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </section>
      ) : null}

      <Card>
        <CardHeader
          title="What each kind of support is for"
          description="Pick whichever fits — none of these is a last resort."
        />
        <CardBody>
          <dl className="space-y-3">
            {(Object.keys(SUPPORT_PATHWAY_LABELS) as SupportPathway[]).map(
              (pathway) => (
                <div key={pathway}>
                  <dt className="text-sm font-medium text-ink-800">
                    {SUPPORT_PATHWAY_LABELS[pathway]}
                  </dt>
                  <dd className="mt-0.5 text-[0.85rem] text-ink-600">
                    {SUPPORT_PATHWAY_DESCRIPTIONS[pathway]}
                  </dd>
                </div>
              ),
            )}
          </dl>
        </CardBody>
      </Card>

      <Notice tone="caution" title="What this prototype does not do" className="mt-8">
        Requests create internal records only. No email or text message is sent, no
        appointment is booked, and neither the teaching assistant nor any tutoring
        service is notified automatically. Your professor sees the request in their
        support view.
      </Notice>
    </>
  );
}
