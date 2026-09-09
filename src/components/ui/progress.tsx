import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Progress, as a visual language rather than a status field.
 *
 * The design direction is "72% / You're on track", not "COURSE COMPLETION STATUS:
 * 72%" — so these components lead with a large number and let a short human line
 * carry the meaning. The label is still exposed to assistive technology in full,
 * because "72%" alone tells a screen-reader user nothing about what it measures.
 */

/**
 * Fill tones, matching the wheel: rings and bars are graphics, not text.
 * `brand` stays at 600 because a thin blue ring at 400 disappears on white.
 */
const TONE_STROKE = {
  brand: "var(--color-brand-600)",
  ink: "var(--color-ink-900)",
  track: "var(--color-track-400)",
  attention: "var(--color-attention-400)",
  concern: "var(--color-concern-400)",
  unknown: "var(--color-unknown-400)",
} as const;

/**
 * Text tones. Separate from the fills on purpose: a 400 fill is deliberately too
 * light to carry text, so anything that paints a *word* has to reach for these.
 */
const TONE_TEXT = {
  brand: "var(--color-brand-700)",
  ink: "var(--color-ink-900)",
  track: "var(--color-track-600)",
  attention: "var(--color-attention-600)",
  concern: "var(--color-concern-600)",
  unknown: "var(--color-unknown-600)",
} as const;

export type ProgressTone = keyof typeof TONE_STROKE;

/**
 * A thin circular indicator with the figure in the middle.
 *
 * `role="img"` with a full label rather than `role="meter"`: the ring is one
 * indivisible picture, and a meter implies a control that can be interrogated.
 */
export function ProgressRing({
  value,
  label,
  caption,
  tone = "brand",
  size = 132,
  stroke = 8,
  children,
  className,
}: {
  /** 0–1. */
  value: number;
  /** What is being measured. Used for the accessible name. */
  label: string;
  /** Short human line under the figure. */
  caption?: ReactNode;
  tone?: ProgressTone;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const pct = Math.round(clamped * 100);
  const radius = (100 - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`${label}: ${pct}%`}
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--color-paper-300)"
          strokeWidth={stroke}
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={TONE_STROKE[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${clamped * circumference} ${circumference}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ?? (
          <>
            <span
              className="font-medium leading-none tracking-[-0.04em] text-ink-900"
              style={{ fontSize: size * 0.26 }}
            >
              {pct}
              <span style={{ fontSize: size * 0.15 }}>%</span>
            </span>
            {caption ? (
              <span
                className="mt-1.5 max-w-[80%] leading-tight text-ink-400"
                style={{ fontSize: Math.max(11, size * 0.095) }}
              >
                {caption}
              </span>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * A horizontal bar for inline use — inside a card, a row, a list.
 *
 * Where `Meter` in primitives.tsx pairs a bar with a label line, this is the bar
 * alone: use it when the surrounding layout already says what is being measured.
 * It still carries an accessible name, so it is never a bare decoration.
 */
export function ProgressBar({
  value,
  label,
  tone = "brand",
  height = 6,
  className,
}: {
  /** 0–1. */
  value: number;
  label: string;
  tone?: ProgressTone;
  height?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const pct = Math.round(clamped * 100);

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${pct}%`}
      className={cn(
        "w-full overflow-hidden rounded-full bg-paper-300",
        className,
      )}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%`, backgroundColor: TONE_STROKE[tone] }}
      />
    </div>
  );
}

/**
 * The headline treatment: an oversized percentage with a human line beneath.
 *
 * Deliberately not a component with a "status" prop — the sentence is written by the
 * caller, because "You're on track" and "Three lessons from finishing" are the same
 * shape but only the page knows which is true.
 */
export function ProgressHeadline({
  value,
  label,
  children,
  tone = "brand",
  className,
}: {
  value: number;
  label: string;
  children?: ReactNode;
  tone?: ProgressTone;
  className?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[0.85rem] text-ink-400">{label}</p>
      <p
        className="mt-1 text-[3.25rem] font-medium leading-[0.95] tracking-[-0.045em]"
        style={{ color: TONE_TEXT[tone] }}
      >
        {pct}%
      </p>
      {children ? (
        <p className="mt-2 text-[0.95rem] leading-snug text-ink-600">
          {children}
        </p>
      ) : null}
    </div>
  );
}
