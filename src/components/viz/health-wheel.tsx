"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * The reusable radial visualisation the dashboards are built from.
 *
 * One component, many wheels: course health, cohort health, a student's own
 * learning. Anything that is "a whole, divided into bands, each worth exploring"
 * uses this rather than growing its own chart.
 *
 * ── How it stays accessible ──────────────────────────────────────────────────
 *
 * A donut that encodes status only in colour would undo the care taken everywhere
 * else in this application, so the ring is deliberately *not* the information. It
 * is the invitation. The legend beneath it carries the same data as text — label,
 * glyph, count and share — and the legend rows are the real interactive elements:
 * proper links, reachable by keyboard, that reveal the same detail panel on focus
 * that the arcs reveal on hover.
 *
 * The whole figure also exposes a single `aria-label` summarising every band, so a
 * screen-reader user gets the five-second read without touching the segments.
 *
 * Motion is a progressive enhancement. `prefers-reduced-motion` is honoured
 * globally in globals.css, which collapses every transition here to nothing.
 */

export type WheelTone = "track" | "attention" | "concern" | "unknown" | "brand";

export type WheelSegment = {
  key: string;
  label: string;
  /** Non-colour redundant cue, mirrored in the legend. */
  glyph: string;
  value: number;
  tone: WheelTone;
  /** Where clicking this band takes you, already filtered. */
  href?: string;
  /** Revealed on hover or focus. Keep it short — this is a peek, not a page. */
  detail?: {
    heading?: string;
    stats?: { label: string; value: string }[];
    items?: string[];
    /** Shown when the band is empty, instead of a bare zero. */
    empty?: string;
  };
};

const ARC_COLOUR: Record<WheelTone, string> = {
  track: "var(--color-track-500)",
  attention: "var(--color-attention-500)",
  concern: "var(--color-concern-500)",
  unknown: "var(--color-unknown-200)",
  brand: "var(--color-accent-400)",
};

const DOT_CLASS: Record<WheelTone, string> = {
  track: "text-track-500",
  attention: "text-attention-500",
  concern: "text-concern-500",
  unknown: "text-unknown-500",
  brand: "text-accent-600",
};

const RADIUS = 78;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Visual breathing room between bands, in path units. */
const GAP = 3;

export function HealthWheel({
  segments,
  centerValue,
  centerLabel,
  caption,
  size = "md",
  className,
}: {
  segments: WheelSegment[];
  centerValue: string;
  centerLabel: string;
  /** One line under the legend, for a caveat or a total. */
  caption?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const panelId = useId();

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const present = segments.filter((s) => s.value > 0);

  // Arc geometry. Empty bands take no arc but keep their legend row, so a zero is
  // still legible — "No courses" is information.
  //
  // Each arc starts where the previous one ended, so the offset is the running sum of
  // everything before it. Expressed as a scan rather than a mutating loop, which
  // keeps the render free of reassignment.
  const arcs = present.map((segment, index) => {
    const before = present
      .slice(0, index)
      .reduce((sum, s) => sum + s.value, 0);
    const share = segment.value / total;
    const length = Math.max(share * CIRCUMFERENCE - GAP, 1);
    return {
      segment,
      share,
      dash: `${length} ${CIRCUMFERENCE - length}`,
      offset: -(before / total) * CIRCUMFERENCE,
    };
  });

  const activeSegment = segments.find((s) => s.key === active) ?? null;

  const summary = segments
    .map((s) => `${s.label}: ${s.value}`)
    .join(". ");

  const dimension = size === "lg" ? "h-64 w-64" : "h-52 w-52";

  return (
    <div className={cn("flex flex-col gap-6 sm:flex-row sm:items-center", className)}>
      <div className="relative shrink-0 self-center">
        <svg
          viewBox="0 0 200 200"
          className={cn(dimension, "-rotate-90")}
          role="img"
          aria-label={`${centerValue} ${centerLabel}. ${summary}.`}
        >
          {/* Track the arcs sit on, so an almost-empty wheel still reads as a ring. */}
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke="var(--color-paper-200)"
            strokeWidth="16"
          />
          {arcs.map(({ segment, dash, offset }) => {
            const isActive = active === segment.key;
            const dimmed = active !== null && !isActive;
            return (
              <circle
                key={segment.key}
                cx="100"
                cy="100"
                r={RADIUS}
                fill="none"
                stroke={ARC_COLOUR[segment.tone]}
                strokeWidth={isActive ? 22 : 16}
                strokeDasharray={dash}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                opacity={dimmed ? 0.35 : 1}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setActive(segment.key)}
                onMouseLeave={() => setActive(null)}
                aria-hidden="true"
              />
            );
          })}
        </svg>

        {/* Centre readout. Rotated back upright, and inert to pointer events so it
            never steals a hover from the arc beneath it. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className={cn(
              "font-serif leading-none text-ink-900",
              size === "lg" ? "text-4xl" : "text-3xl",
            )}
          >
            {centerValue}
          </span>
          <span className="mt-1.5 max-w-28 text-[0.75rem] leading-tight text-ink-500">
            {centerLabel}
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <ul className="space-y-1">
          {segments.map((segment) => {
            const isActive = active === segment.key;
            const share = total > 0 ? Math.round((segment.value / total) * 100) : 0;

            const row = (
              <>
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={cn("text-[0.9rem]", DOT_CLASS[segment.tone])}
                  >
                    {segment.glyph}
                  </span>
                  <span className="truncate text-[0.9rem] text-ink-700">
                    {segment.label}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-[0.9rem] font-medium text-ink-800">
                  {segment.value}
                  {total > 0 ? (
                    <span className="ml-1.5 font-normal text-ink-400">{share}%</span>
                  ) : null}
                </span>
              </>
            );

            const rowClass = cn(
              "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left no-underline transition-colors",
              isActive ? "bg-paper-200" : "hover:bg-paper-100",
            );

            return (
              <li key={segment.key}>
                {segment.href ? (
                  <Link
                    href={segment.href}
                    className={rowClass}
                    onMouseEnter={() => setActive(segment.key)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(segment.key)}
                    onBlur={() => setActive(null)}
                    aria-describedby={isActive ? panelId : undefined}
                  >
                    {row}
                  </Link>
                ) : (
                  <span
                    className={rowClass}
                    onMouseEnter={() => setActive(segment.key)}
                    onMouseLeave={() => setActive(null)}
                  >
                    {row}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {caption ? (
          <p className="mt-3 px-3 text-[0.8rem] text-ink-400">{caption}</p>
        ) : null}
      </div>

      {/* The peek. Rendered in flow rather than floating, so it never covers the
          legend it was triggered from and needs no positioning logic. */}
      <div
        id={panelId}
        role="status"
        aria-live="polite"
        className={cn(
          "min-w-0 shrink-0 sm:w-56",
          activeSegment?.detail ? "" : "sr-only",
        )}
      >
        {activeSegment?.detail ? (
          <div className="rounded-xl border border-tan-100 bg-white p-4 shadow-[0_4px_16px_rgba(4,43,50,0.06)]">
            <p className="flex items-center gap-2 text-[0.78rem] font-semibold uppercase tracking-wide text-ink-500">
              <span
                aria-hidden="true"
                className={DOT_CLASS[activeSegment.tone]}
              >
                {activeSegment.glyph}
              </span>
              {activeSegment.detail.heading ?? activeSegment.label}
            </p>

            {activeSegment.value === 0 ? (
              <p className="mt-2 text-[0.85rem] text-ink-500">
                {activeSegment.detail.empty ?? "Nothing in this band."}
              </p>
            ) : (
              <>
                {activeSegment.detail.stats?.length ? (
                  <dl className="mt-3 space-y-1.5">
                    {activeSegment.detail.stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <dt className="text-[0.8rem] text-ink-500">{stat.label}</dt>
                        <dd className="text-[0.85rem] font-medium text-ink-800">
                          {stat.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {activeSegment.detail.items?.length ? (
                  <ul className="mt-3 space-y-1">
                    {activeSegment.detail.items.slice(0, 6).map((item) => (
                      <li key={item} className="truncate text-[0.85rem] text-ink-700">
                        {item}
                      </li>
                    ))}
                    {activeSegment.detail.items.length > 6 ? (
                      <li className="text-[0.8rem] text-ink-400">
                        + {activeSegment.detail.items.length - 6} more
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </>
            )}

            {activeSegment.href ? (
              <p className="mt-3 border-t border-tan-100 pt-2 text-[0.78rem] text-ink-400">
                Select to open
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
