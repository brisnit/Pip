import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Sparkle } from "lucide-react";
import { ArtBackdrop, type Motif } from "@/components/viz/abstract";
import { ProgressBar, type ProgressTone } from "@/components/ui/progress";
import { cn } from "@/lib/cn";

/**
 * The card hierarchy.
 *
 * Four levels, so a screen can say what matters without every surface shouting:
 *
 *   FeatureCard   one per screen at most. Gradient, artwork, the next action.
 *   LearningCard  the standard content card — a course, a module, a topic.
 *   LessonRow     a compact row in a list. Dense, still comfortable to tap.
 *   AIInsight     a quiet utility surface for what the system has noticed.
 *
 * Every one is a link when it has somewhere to go, and the whole surface is the
 * target rather than a small "view" affordance in the corner.
 */

// ── Feature ──────────────────────────────────────────────────────────────────

/**
 * The hero. Soft blue gradient, abstract artwork bleeding off the corner, and the
 * single action the screen wants you to take.
 *
 * `eyebrow` is the small line above the title — "Continue learning", "Up next".
 * It is what makes the card feel like a moment rather than a tile.
 */
export function FeatureCard({
  eyebrow,
  title,
  description,
  href,
  actionLabel = "Continue",
  motif = "orbit",
  seedId,
  stats,
  footer,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  href?: string;
  actionLabel?: string;
  motif?: Motif;
  seedId?: string;
  stats?: { label: string; value: ReactNode }[];
  footer?: ReactNode;
  className?: string;
}) {
  const body = (
    <>
      <ArtBackdrop motif={motif} seedId={seedId} />

      <div className="relative min-w-0">
        {eyebrow ? (
          <p className="text-[0.85rem] font-medium text-brand-700">{eyebrow}</p>
        ) : null}

        <h2 className="mt-2 max-w-[13ch] text-[1.9rem] font-medium leading-[1.06] tracking-[-0.032em] text-ink-900 sm:max-w-[16ch] sm:text-[2.35rem]">
          {title}
        </h2>

        {description ? (
          <p className="mt-3 max-w-[46ch] text-[0.98rem] leading-relaxed text-ink-600">
            {description}
          </p>
        ) : null}

        {stats && stats.length > 0 ? (
          <dl className="mt-7 flex flex-wrap items-end gap-x-10 gap-y-5">
            {stats.map((stat) => (
              <div key={String(stat.label)} className="min-w-0">
                <dt className="text-[0.82rem] text-ink-400">{stat.label}</dt>
                <dd className="mt-1 text-[1.75rem] font-medium leading-none tracking-[-0.035em] text-ink-900">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>

      {href ? (
        <span
          aria-hidden="true"
          className="relative mt-8 inline-flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-full bg-ink-900 text-white transition-transform duration-200 ease-out group-hover:translate-x-0.5"
        >
          <ArrowRight size={20} strokeWidth={1.75} />
        </span>
      ) : null}
    </>
  );

  const surface = cn(
    "group relative flex flex-col justify-between overflow-hidden rounded-[2rem]",
    "border border-[var(--border)] bg-gradient-to-br from-white via-[#f4f7ff] to-[#e3ebff]",
    "p-7 shadow-[var(--shadow-soft)] sm:p-9",
    href &&
      "no-underline transition-shadow duration-200 ease-out hover:shadow-[var(--shadow-lift)]",
    className,
  );

  if (!href) return <section className={surface}>{body}</section>;

  return (
    <Link href={href} className={surface} aria-label={actionLabel}>
      {body}
    </Link>
  );
}

// ── Learning card ────────────────────────────────────────────────────────────

/**
 * The workhorse: one course, module or topic, with its signal.
 *
 * `progress` is optional because not everything has a percentage, and inventing one
 * to fill the slot would be worse than leaving it out.
 */
export function LearningCard({
  eyebrow,
  title,
  description,
  href,
  progress,
  progressLabel,
  progressTone = "brand",
  meta,
  badge,
  footer,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  href?: string;
  /** 0–1. */
  progress?: number;
  progressLabel?: ReactNode;
  progressTone?: ProgressTone;
  meta?: ReactNode;
  badge?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[0.8rem] font-medium text-brand-700">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="mt-1 text-[1.3rem] font-medium leading-snug tracking-[-0.022em] text-ink-900">
            {title}
          </h3>
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>

      {description ? (
        <p className="mt-2.5 line-clamp-2 text-[0.92rem] leading-relaxed text-ink-500">
          {description}
        </p>
      ) : null}

      {progress !== undefined ? (
        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[0.85rem] text-ink-500">{progressLabel}</span>
            <span className="text-[1.05rem] font-medium tabular-nums text-ink-900">
              {Math.round(progress * 100)}%
            </span>
          </div>
          <ProgressBar
            value={progress}
            label={
              typeof progressLabel === "string" ? progressLabel : "Progress"
            }
            tone={progressTone}
            className="mt-2"
          />
        </div>
      ) : null}

      {meta ? (
        <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.85rem] text-ink-400">
          {meta}
        </p>
      ) : null}

      {footer ? <div className="mt-5">{footer}</div> : null}
    </>
  );

  const surface = cn(
    "block rounded-[1.5rem] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-card)]",
    href &&
      "no-underline transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]",
    className,
  );

  if (!href) return <div className={surface}>{inner}</div>;
  return (
    <Link href={href} className={surface}>
      {inner}
    </Link>
  );
}

// ── Lesson row ───────────────────────────────────────────────────────────────

/**
 * A compact row: numbered, with a leading control and a trailing time or status.
 *
 * The leading circle is decorative here — the whole row is the link, so putting a
 * second focusable control inside it would add a keyboard stop that goes to the same
 * place.
 */
export function LessonRow({
  index,
  title,
  description,
  href,
  trailing,
  leading,
  active = false,
  className,
}: {
  index?: number;
  title: ReactNode;
  description?: ReactNode;
  href?: string;
  trailing?: ReactNode;
  leading?: ReactNode;
  active?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[0.9rem] font-medium transition-colors",
          active
            ? "bg-ink-900 text-white"
            : "bg-paper-200 text-brand-700 group-hover:bg-brand-100",
        )}
      >
        {leading ?? index}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.98rem] font-medium text-ink-900">
          {index !== undefined && leading ? `${index}. ` : ""}
          {title}
        </span>
        {description ? (
          <span className="mt-0.5 block truncate text-[0.86rem] text-ink-500">
            {description}
          </span>
        ) : null}
      </span>

      {trailing ? (
        <span className="shrink-0 text-[0.86rem] tabular-nums text-ink-400">
          {trailing}
        </span>
      ) : null}
    </>
  );

  const surface = cn(
    "group flex items-center gap-4 rounded-[1.125rem] px-4 py-3 transition-colors",
    href ? "no-underline hover:bg-paper-200" : "",
    active && "bg-paper-200",
    className,
  );

  if (!href) return <div className={surface}>{inner}</div>;
  return (
    <Link href={href} className={surface}>
      {inner}
    </Link>
  );
}

// ── AI insight ───────────────────────────────────────────────────────────────

/**
 * What the system has noticed, said plainly.
 *
 * No robot, no glowing brain, no shower of sparkles — one small mark and a sentence
 * in the product's own voice. The whole point of the direction is that intelligence
 * reads as embedded rather than bolted on, and a mascot undoes that immediately.
 *
 * `provenance` exists because this product distinguishes what a model produced from
 * what was assembled by rule, and that distinction has to survive a restyle.
 */
export function AIInsight({
  title,
  children,
  href,
  actionLabel,
  provenance,
  tone = "tonal",
  className,
}: {
  title: ReactNode;
  children?: ReactNode;
  href?: string;
  actionLabel?: string;
  provenance?: ReactNode;
  tone?: "tonal" | "plain";
  className?: string;
}) {
  const inner = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
          tone === "tonal"
            ? "bg-white text-brand-600"
            : "bg-brand-50 text-brand-600",
        )}
      >
        <Sparkle size={18} strokeWidth={1.75} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[0.98rem] font-medium text-ink-900">
          {title}
        </span>
        {children ? (
          <span className="mt-1 block text-[0.89rem] leading-relaxed text-ink-600">
            {children}
          </span>
        ) : null}
        {provenance ? (
          <span className="mt-2 block text-[0.78rem] text-ink-400">
            {provenance}
          </span>
        ) : null}
      </span>

      {href ? (
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink-700 transition-transform duration-200 group-hover:translate-x-0.5"
        >
          <ArrowRight size={16} strokeWidth={1.75} />
        </span>
      ) : null}
    </>
  );

  const surface = cn(
    "group flex items-start gap-4 rounded-[1.5rem] p-5",
    tone === "tonal"
      ? "bg-brand-50"
      : "border border-[var(--border)] bg-white shadow-[var(--shadow-card)]",
    href && "no-underline transition-colors hover:bg-brand-100",
    className,
  );

  if (!href) return <div className={surface}>{inner}</div>;
  return (
    <Link href={href} className={surface} aria-label={actionLabel}>
      {inner}
    </Link>
  );
}
