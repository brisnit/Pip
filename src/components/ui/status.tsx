import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  CONFIDENCE_COPY,
  READINESS_PRESENTATION,
  READINESS_STATUSES,
  type EstimateConfidence,
  type ReadinessStatus,
} from "@/lib/domain/vocabulary";
import {
  OBJECTIVE_STANDING_LABELS,
  type ObjectiveStanding,
} from "@/lib/domain/readiness";

/**
 * Readiness status indicator.
 *
 * WCAG 2.2 requirement this component exists to satisfy: colour is never the only
 * carrier of meaning. Every instance renders three redundant cues —
 *  1. a shape glyph (● ◐ ◆ ○) that differs per status,
 *  2. the status text label,
 *  3. the colour band.
 * The glyph is aria-hidden because the adjacent label already reads correctly to
 * a screen reader.
 */
const STATUS_CLASSES: Record<ReadinessStatus, { chip: string; dot: string }> = {
  on_track: {
    chip: "border-track-200 bg-track-50 text-track-600",
    dot: "text-track-500",
  },
  needs_review: {
    chip: "border-attention-200 bg-attention-50 text-attention-600",
    dot: "text-attention-500",
  },
  support_recommended: {
    chip: "border-concern-200 bg-concern-50 text-concern-600",
    dot: "text-concern-500",
  },
  insufficient_data: {
    chip: "border-unknown-200 bg-unknown-50 text-unknown-600",
    dot: "text-unknown-500",
  },
};

export function StatusPill({
  status,
  size = "md",
  className,
}: {
  status: ReadinessStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  const presentation = READINESS_PRESENTATION[status];
  const classes = STATUS_CLASSES[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[0.75rem]" : "px-2.5 py-1 text-[0.82rem]",
        classes.chip,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("text-[0.9em] leading-none", classes.dot)}>
        {presentation.glyph}
      </span>
      {presentation.label}
    </span>
  );
}

/** The legend that makes the roster readable without relying on colour. */
export function StatusLegend({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-md border border-tan-100 bg-paper-50 p-4", className)}>
      <h3 className="text-sm font-semibold">Reading these statuses</h3>
      <dl className="mt-3 space-y-2.5">
        {READINESS_STATUSES.map((status) => {
          const presentation = READINESS_PRESENTATION[status];
          return (
            <div key={status} className="flex gap-3 text-sm">
              <dt className="shrink-0">
                <StatusPill status={status} size="sm" />
                <span className="sr-only">{presentation.glyphLabel}</span>
              </dt>
              <dd className="text-ink-500">{presentation.professorSentence}</dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-3 border-t border-tan-100 pt-3 text-[0.82rem] text-ink-500">
        These are prototype signals drawn from recorded coursework activity. They
        are not grades, and no status is a judgement about a student.
      </p>
    </div>
  );
}

export function ConfidenceNote({
  confidence,
  className,
}: {
  confidence: EstimateConfidence;
  className?: string;
}) {
  const tone = {
    low: "border-unknown-200 bg-unknown-50 text-unknown-600",
    moderate: "border-tan-200 bg-paper-200 text-ink-600",
    high: "border-tan-200 bg-paper-200 text-ink-600",
  }[confidence];

  return (
    <p className={cn("rounded-md border px-3 py-2 text-[0.82rem]", tone, className)}>
      <span className="font-semibold capitalize">{confidence} confidence.</span>{" "}
      {CONFIDENCE_COPY[confidence].split("— ")[1] ?? CONFIDENCE_COPY[confidence]}
    </p>
  );
}

const STANDING_CLASSES: Record<ObjectiveStanding, { chip: string; glyph: string }> = {
  understood: { chip: "border-track-200 bg-track-50 text-track-600", glyph: "●" },
  developing: {
    chip: "border-tan-200 bg-paper-200 text-ink-600",
    glyph: "◑",
  },
  needs_review: {
    chip: "border-attention-200 bg-attention-50 text-attention-600",
    glyph: "◐",
  },
  unknown: { chip: "border-unknown-200 bg-unknown-50 text-unknown-600", glyph: "○" },
};

export function StandingPill({
  standing,
  className,
}: {
  standing: ObjectiveStanding;
  className?: string;
}) {
  const classes = STANDING_CLASSES[standing];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.75rem] font-medium",
        classes.chip,
        className,
      )}
    >
      <span aria-hidden="true">{classes.glyph}</span>
      {OBJECTIVE_STANDING_LABELS[standing]}
    </span>
  );
}

/** Small horizontal band chart of the class spread. Text totals always shown. */
export function StatusDistribution({
  counts,
  total,
}: {
  counts: Record<ReadinessStatus, number>;
  total: number;
}) {
  if (total === 0) {
    return (
      <p className="text-sm text-ink-500">
        No students have joined this course yet.
      </p>
    );
  }

  const bands: { status: ReadinessStatus; bar: string }[] = [
    { status: "on_track", bar: "bg-track-500" },
    { status: "needs_review", bar: "bg-attention-500" },
    { status: "support_recommended", bar: "bg-concern-500" },
    { status: "insufficient_data", bar: "bg-unknown-500" },
  ];

  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-paper-300"
        role="img"
        aria-label={bands
          .map(
            ({ status }) =>
              `${READINESS_PRESENTATION[status].label}: ${counts[status]} of ${total}`,
          )
          .join("; ")}
      >
        {bands.map(({ status, bar }) =>
          counts[status] > 0 ? (
            <div
              key={status}
              className={bar}
              style={{ width: `${(counts[status] / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {bands.map(({ status }) => (
          <li key={status} className="flex items-center justify-between gap-2 text-sm">
            <StatusPill status={status} size="sm" />
            <span className="tabular-nums text-ink-700">
              {counts[status]}{" "}
              <span className="text-ink-400">
                ({Math.round((counts[status] / total) * 100)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "Why this status" list. Never rendered without its heading. */
export function ReasonList({
  reasons,
  title = "Why this status",
  children,
}: {
  reasons: string[];
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {reasons.length === 0 ? (
        <p className="mt-2 text-sm text-ink-500">
          No signals have been recorded yet.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {reasons.map((reason) => (
            <li key={reason} className="flex gap-2 text-sm text-ink-700">
              <span aria-hidden="true" className="mt-[0.35em] text-accent-600">
                ▸
              </span>
              <span className="min-w-0">{reason}</span>
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}
