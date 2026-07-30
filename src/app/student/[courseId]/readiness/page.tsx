import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  Meter,
  Notice,
  SectionHeading,
} from "@/components/ui/primitives";
import {
  ConfidenceNote,
  ReasonList,
  StandingPill,
  StatusPill,
} from "@/components/ui/status";
import {
  READINESS_PRESENTATION,
  SUPPORT_PATHWAY_LABELS,
} from "@/lib/domain/vocabulary";
import { OBJECTIVE_STANDING_LABELS } from "@/lib/domain/readiness";
import { formatDateTime, percent, relativeTime } from "@/lib/format";
import { getUpcomingAssessment } from "@/lib/repositories/assessments";
import { getCourse } from "@/lib/repositories/courses";
import { readinessFor } from "@/lib/repositories/readiness";
import {
  draftRecommendations,
  listRecommendations,
} from "@/lib/repositories/support";
import { currentStudentInCourse } from "@/lib/role/role-context";

export const metadata: Metadata = { title: "Study readiness" };

export default async function StudentReadinessPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  const student = await currentStudentInCourse(courseId);
  if (!course || !student) notFound();

  const readiness = readinessFor(courseId, student.studentId);
  const upcoming = getUpcomingAssessment(courseId);
  const assigned = listRecommendations(courseId, {
    studentId: student.studentId,
    activeOnly: true,
  });
  const suggested = draftRecommendations(courseId, readiness);

  const presentation = READINESS_PRESENTATION[readiness.status];
  const scoredSignals = readiness.signals.filter(
    (signal) => signal.weight > 0 && signal.value !== null,
  );
  const contextSignals = readiness.signals.filter(
    (signal) => signal.direction === "context" || signal.weight === 0,
  );

  return (
    <>
      <SectionHeading
        level={1}
        title="Study readiness"
        description="An honest read on where your recorded coursework activity puts you. Not a grade, and not reported anywhere."
      />

      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <StatusPill status={readiness.status} />
              <p className="mt-3 max-w-2xl text-[1.05rem] leading-relaxed text-ink-700">
                {presentation.studentSentence}
              </p>
              {readiness.score !== null ? (
                <p className="mt-2 text-[0.85rem] text-ink-500">
                  Composite reading {percent(readiness.score)}, from{" "}
                  {readiness.evidenceCount} recorded data points. Last activity{" "}
                  {relativeTime(readiness.lastActivityAt)}.
                </p>
              ) : null}
            </div>
            {upcoming ? (
              <div className="shrink-0 rounded-md border border-tan-200 bg-paper-100 px-4 py-3 text-[0.85rem]">
                <p className="font-medium text-ink-800">{upcoming.title}</p>
                <p className="mt-0.5 text-ink-500">
                  {formatDateTime(upcoming.scheduled_at)}
                </p>
              </div>
            ) : null}
          </div>

          {readiness.override ? (
            <Notice tone="info" title="Your professor set this status" className="mt-5">
              <p>&ldquo;{readiness.override.reason}&rdquo;</p>
              <p className="mt-2 text-[0.85em]">
                — {readiness.override.setByName},{" "}
                {formatDateTime(readiness.override.createdAt)}
              </p>
            </Notice>
          ) : null}

          <div className="mt-5">
            <ConfidenceNote confidence={readiness.confidence} />
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="You appear comfortable with"
            description={
              readiness.strengths.length === 0
                ? "Nothing has enough supporting evidence to list here yet."
                : undefined
            }
          />
          <CardBody className="p-0">
            {readiness.strengths.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-500">
                Answer a few more comprehension checks and this fills in. An empty
                list here means missing evidence, not a missing ability.
              </p>
            ) : (
              <ul className="divide-y divide-tan-100">
                {readiness.strengths.map((row) => (
                  <li key={row.objective.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 text-sm text-ink-700">
                        {row.objective.text}
                      </p>
                      <StandingPill standing={row.standing} />
                    </div>
                    <p className="mt-1 text-[0.8rem] text-ink-500">
                      {row.answered > 0
                        ? `${row.correct} of ${row.answered} related questions correct`
                        : "Based on your markers and confidence ratings"}
                      {row.clearMarkers > 0
                        ? ` · ${row.clearMarkers} moment${row.clearMarkers === 1 ? "" : "s"} marked clear`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="You may need additional review in"
            description={
              readiness.gaps.length === 0
                ? "Nothing specific stands out."
                : undefined
            }
          />
          <CardBody className="p-0">
            {readiness.gaps.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-500">
                No topic is showing weak evidence right now.
              </p>
            ) : (
              <ul className="divide-y divide-tan-100">
                {readiness.gaps.map((row) => (
                  <li key={row.objective.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 text-sm text-ink-700">
                        {row.objective.text}
                      </p>
                      <StandingPill standing={row.standing} />
                    </div>
                    <p className="mt-1 text-[0.8rem] text-ink-500">
                      {row.answered > 0
                        ? `${row.correct} of ${row.answered} related questions correct`
                        : "No related questions answered yet"}
                      {row.confusingMarkers > 0
                        ? ` · ${row.confusingMarkers} moment${row.confusingMarkers === 1 ? "" : "s"} you marked confusing`
                        : ""}
                      {row.averageConfidence !== null
                        ? ` · your confidence ${row.averageConfidence.toFixed(1)} / 5`
                        : ""}
                    </p>
                    {row.confusingConcepts.length > 0 ? (
                      <p className="mt-1 text-[0.8rem] text-attention-600">
                        Specifically: {row.confusingConcepts.join("; ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Why"
          description="Everything the model used. If any of it looks wrong, it is worth saying so to your professor."
        />
        <CardBody className="space-y-6">
          <ReasonList reasons={readiness.reasons} title="In short" />

          <div className="border-t border-tan-100 pt-5">
            <h3 className="mb-3 text-sm font-semibold">Signals that carry weight</h3>
            {scoredSignals.length === 0 ? (
              <p className="text-sm text-ink-500">
                No weighted signal has data yet.
              </p>
            ) : (
              <ul className="space-y-3.5">
                {scoredSignals.map((signal) => (
                  <li key={signal.kind}>
                    <Meter
                      label={signal.label}
                      value={signal.value as number}
                      valueText={percent(signal.value)}
                      tone={
                        signal.direction === "positive"
                          ? "track"
                          : signal.direction === "negative"
                            ? "attention"
                            : "unknown"
                      }
                    />
                    <p className="mt-1 text-[0.82rem] text-ink-500">
                      {signal.detail}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-tan-100 pt-5">
            <h3 className="mb-2 text-sm font-semibold">
              Context, not counted against you
            </h3>
            <ul className="space-y-2">
              {contextSignals.map((signal) => (
                <li key={signal.kind} className="text-[0.85rem] text-ink-600">
                  <span className="font-medium">{signal.label}:</span>{" "}
                  {signal.detail}
                </li>
              ))}
            </ul>
          </div>

          {readiness.unassessed.length > 0 ? (
            <div className="border-t border-tan-100 pt-5">
              <h3 className="mb-2 text-sm font-semibold">
                Not enough information yet
              </h3>
              <p className="text-[0.85rem] text-ink-500">
                These objectives have no recorded evidence either way. They are not
                counted in your status.
              </p>
              <ul className="mt-2 space-y-1">
                {readiness.unassessed.map((row) => (
                  <li key={row.objective.id} className="text-[0.85rem] text-ink-600">
                    {row.objective.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Objective by objective"
          description="The full picture, including what has not been assessed."
        />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                Your standing on each learning objective, with the evidence behind
                it
              </caption>
              <thead>
                <tr className="border-b border-tan-200 bg-paper-100 text-[0.78rem] uppercase tracking-wide text-ink-500">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Objective
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Standing
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Questions
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Markers
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Your confidence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tan-100">
                {readiness.objectives.map((row) => (
                  <tr key={row.objective.id} className="align-top">
                    <th
                      scope="row"
                      className="px-4 py-3 text-left font-normal text-ink-700"
                    >
                      <span className="font-medium text-brand-600">
                        {row.objective.code}
                      </span>{" "}
                      {row.objective.text}
                    </th>
                    <td className="px-4 py-3">
                      <StandingPill standing={row.standing} />
                      <span className="sr-only">
                        {OBJECTIVE_STANDING_LABELS[row.standing]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {row.answered > 0
                        ? `${row.correct} / ${row.answered}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-[0.82rem] text-ink-600">
                      {row.clearMarkers > 0 ? `${row.clearMarkers} clear` : null}
                      {row.clearMarkers > 0 && row.confusingMarkers > 0 ? ", " : null}
                      {row.confusingMarkers > 0
                        ? `${row.confusingMarkers} confusing`
                        : null}
                      {row.clearMarkers === 0 && row.confusingMarkers === 0
                        ? "—"
                        : null}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {row.averageConfidence !== null
                        ? `${row.averageConfidence.toFixed(1)} / 5`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="What to do about it"
          description={
            assigned.length > 0
              ? `${assigned.length} step(s) already on your support plan.`
              : "Suggested from your professor's published material."
          }
          action={
            <ButtonLink
              href={`/student/${courseId}/support`}
              variant="secondary"
              size="sm"
            >
              Open support plan
            </ButtonLink>
          }
        />
        <CardBody className="p-0">
          <ul className="divide-y divide-tan-100">
            {(assigned.length > 0
              ? assigned.map((rec) => ({
                  key: rec.id,
                  pathway: rec.pathway,
                  title: rec.title,
                  rationale: rec.rationale,
                  nextStep: rec.next_step,
                  assigned: true,
                }))
              : suggested.map((draft) => ({
                  key: `${draft.pathway}-${draft.title}`,
                  pathway: draft.pathway,
                  title: draft.title,
                  rationale: draft.rationale,
                  nextStep: draft.nextStep,
                  assigned: false,
                }))
            ).map((item) => (
              <li key={item.key} className="px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">
                    {SUPPORT_PATHWAY_LABELS[item.pathway]}
                  </Badge>
                  {item.assigned ? (
                    <Badge tone="accent">On your plan</Badge>
                  ) : (
                    <span className="text-[0.75rem] text-ink-400">suggested</span>
                  )}
                </div>
                <p className="mt-1.5 text-sm font-medium text-ink-800">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[0.82rem] text-ink-500">
                  {item.rationale}
                </p>
                <p className="mt-1 text-[0.85rem] text-ink-700">
                  <span className="font-medium">Next step:</span> {item.nextStep}
                </p>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Notice tone="caution" title="How to read this" className="mt-8">
        <p>
          This is computed from your recorded coursework activity. It is not a grade,
          carries no academic weight, and is not reported to anyone beyond your
          professor&rsquo;s view of this course.
        </p>
        <p className="mt-2">
          It can be wrong. It only knows what you have recorded — if you understand
          something well but have not answered anything about it, it will say so
          honestly rather than guess. If a status does not match your experience,
          tell your professor; they can change it, and the explanation appears
          here.
        </p>
        <p className="mt-2">
          <Link href="/about">How readiness is calculated →</Link>
        </p>
      </Notice>
    </>
  );
}
