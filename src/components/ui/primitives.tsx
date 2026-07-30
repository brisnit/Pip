import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

// Buttons --------------------------------------------------------------------

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-burgundy-600 text-cream-50 border-burgundy-600 hover:bg-burgundy-700 hover:border-burgundy-700",
  secondary:
    "bg-white text-ink-800 border-sand-200 hover:bg-cream-100 hover:border-sand-300",
  ghost:
    "bg-transparent text-burgundy-600 border-transparent hover:bg-burgundy-50 underline underline-offset-2 decoration-burgundy-200",
  danger:
    "bg-white text-concern-600 border-concern-200 hover:bg-concern-50 hover:border-concern-500",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[0.86rem]",
  md: "px-4 py-2.5 text-[0.95rem]",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md border font-medium " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-55 no-underline text-center";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...props}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link
      {...props}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
    />
  );
}

// Surfaces -------------------------------------------------------------------

const CARD_SURFACE =
  "rounded-lg border border-sand-100 bg-white shadow-[0_1px_2px_rgba(28,26,24,0.04)]";

export function Card({
  as = "section",
  className,
  children,
  ...props
}: ComponentProps<"section"> & { as?: "section" | "article" | "div" | "li" }) {
  const As = as as "section";
  return (
    <As {...props} className={cn(CARD_SURFACE, className)}>
      {children}
    </As>
  );
}

export function CardBody({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div {...props} className={cn("p-5 sm:p-6", className)} />;
}

export function CardHeader({
  title,
  description,
  action,
  level = 2,
  id,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  level?: 2 | 3;
  id?: string;
  className?: string;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-sand-100 px-5 py-4 sm:px-6",
        className,
      )}
    >
      <div className="min-w-0">
        <Heading
          id={id}
          className={cn(level === 2 ? "text-lg" : "text-base", "font-semibold")}
        >
          {title}
        </Heading>
        {description ? (
          <p className="mt-1 text-sm text-ink-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
  level = 2,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  level?: 1 | 2 | 3;
  id?: string;
}) {
  const Heading = (level === 1 ? "h1" : level === 2 ? "h2" : "h3") as "h1";
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <Heading
          id={id}
          className={cn(
            level === 1 ? "text-2xl sm:text-3xl" : level === 2 ? "text-xl" : "text-base",
            "font-semibold",
          )}
        >
          {title}
        </Heading>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-ink-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

// Badges ---------------------------------------------------------------------

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "burgundy" | "gold" | "track" | "attention" | "concern";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-cream-200 text-ink-600 border-sand-200",
    burgundy: "bg-burgundy-50 text-burgundy-700 border-burgundy-200",
    gold: "bg-gold-100 text-gold-600 border-gold-200",
    track: "bg-track-50 text-track-600 border-track-200",
    attention: "bg-attention-50 text-attention-600 border-attention-200",
    concern: "bg-concern-50 text-concern-600 border-concern-200",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.72rem] font-medium uppercase tracking-wide",
        tones,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Marks a row or screen as seeded demonstration data. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge tone="neutral" className={className}>
      <span aria-hidden="true">◇</span> Demo data
    </Badge>
  );
}

// Notices --------------------------------------------------------------------

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "caution" | "privacy" | "ai";
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-sand-200 bg-cream-200 text-ink-700",
    caution: "border-attention-200 bg-attention-50 text-attention-600",
    privacy: "border-burgundy-200 bg-burgundy-50 text-burgundy-800",
    ai: "border-gold-200 bg-gold-100 text-gold-600",
  }[tone];

  const glyph = { info: "i", caution: "!", privacy: "◈", ai: "◆" }[tone];

  return (
    <div
      className={cn("rounded-md border px-4 py-3 text-sm", tones, className)}
      role={tone === "caution" ? "alert" : undefined}
    >
      <div className="flex gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[0.6rem] font-bold"
        >
          {glyph}
        </span>
        <div className="min-w-0">
          {title ? <p className="font-semibold">{title}</p> : null}
          <div className={cn(title && "mt-1", "[&_a]:underline")}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// Empty state ----------------------------------------------------------------

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-sand-200 bg-cream-50 px-6 py-10 text-center",
        className,
      )}
    >
      <p className="font-serif text-lg text-ink-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

// Stat -----------------------------------------------------------------------

export function Stat({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: "neutral" | "track" | "attention" | "concern" | "unknown";
}) {
  const valueTone = {
    neutral: "text-ink-900",
    track: "text-track-600",
    attention: "text-attention-600",
    concern: "text-concern-600",
    unknown: "text-unknown-600",
  }[tone];

  return (
    <div className="min-w-0">
      <dt className="text-[0.78rem] font-medium uppercase tracking-wide text-ink-400">
        {label}
      </dt>
      <dd className={cn("mt-1 font-serif text-2xl leading-tight", valueTone)}>
        {value}
      </dd>
      {detail ? (
        <p className="mt-1 text-[0.82rem] leading-snug text-ink-500">{detail}</p>
      ) : null}
    </div>
  );
}

/**
 * An accessible proportion bar.
 *
 * Always renders the numeric value as text as well, so the bar is decoration
 * rather than the only carrier of information.
 */
export function Meter({
  label,
  value,
  max = 1,
  valueText,
  tone = "burgundy",
}: {
  label: string;
  value: number;
  max?: number;
  valueText: string;
  tone?: "burgundy" | "track" | "attention" | "concern" | "unknown";
}) {
  const pct = max === 0 ? 0 : Math.max(0, Math.min(1, value / max)) * 100;
  const barTone = {
    burgundy: "bg-burgundy-500",
    track: "bg-track-500",
    attention: "bg-attention-500",
    concern: "bg-concern-500",
    unknown: "bg-unknown-500",
  }[tone];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 text-ink-700">{label}</span>
        <span className="shrink-0 font-medium text-ink-800">{valueText}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={valueText}
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-cream-300"
      >
        <div className={cn("h-full rounded-full", barTone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Definition list ------------------------------------------------------------

export function DetailList({
  items,
  className,
}: {
  items: { label: string; value: ReactNode }[];
  className?: string;
}) {
  const visible = items.filter((item) => item.value !== null && item.value !== "");
  if (visible.length === 0) return null;

  return (
    <dl className={cn("grid gap-x-6 gap-y-3 sm:grid-cols-2", className)}>
      {visible.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[0.78rem] font-medium uppercase tracking-wide text-ink-400">
            {item.label}
          </dt>
          <dd className="mt-0.5 text-sm text-ink-800">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
