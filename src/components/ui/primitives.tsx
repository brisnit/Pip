import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { product } from "@/config/product";
import { cn } from "@/lib/cn";

// Buttons --------------------------------------------------------------------

type Variant = "primary" | "brand" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

/**
 * Buttons are pills, and the primary one is near-black rather than blue.
 *
 * That inversion is the point of the system: saturated #2F5BFF is an accent that
 * should appear a few times on a screen, so if every call to action were blue it
 * would stop meaning anything. Near-black carries the default action; `brand` is
 * there for the rare moment that genuinely wants the blue.
 *
 * Secondary is a pale blue tint with a hairline border — quiet, but still clearly a
 * control, which a borderless ghost button is not.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ink-900 text-white border-ink-900 hover:bg-ink-800 hover:border-ink-800 shadow-[0_2px_10px_rgba(11,13,22,0.16)]",
  brand:
    "bg-brand-600 text-white border-brand-600 hover:bg-brand-700 hover:border-brand-700 shadow-[0_2px_10px_rgba(47,91,255,0.24)]",
  secondary: "bg-paper-200 text-ink-900 border-transparent hover:bg-paper-300",
  ghost:
    "bg-transparent text-ink-600 border-transparent hover:bg-paper-200 hover:text-ink-900",
  danger:
    "bg-white text-concern-600 border-concern-200 hover:bg-concern-50 hover:border-concern-500",
};

const SIZES: Record<Size, string> = {
  // Minimum 44px tall from `md` up, so every real control clears the mobile
  // touch-target guidance without a special case.
  sm: "h-9 px-4 text-[0.86rem]",
  md: "h-11 px-5 text-[0.94rem]",
  lg: "h-[3.25rem] px-7 text-[1.02rem]",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full border font-medium " +
  "transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out " +
  "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 " +
  "disabled:hover:bg-inherit no-underline text-center whitespace-nowrap";

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

/**
 * A circular control carrying an icon and nothing else.
 *
 * `label` is required and becomes the accessible name — an icon button with no name
 * is invisible to a screen reader, and that is easy to forget when the visual design
 * makes the meaning feel obvious.
 */
export function IconButton({
  label,
  variant = "surface",
  size = "md",
  className,
  children,
  ...props
}: Omit<ComponentProps<"button">, "aria-label"> & {
  label: string;
  variant?: "surface" | "solid" | "brand" | "ghost";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      {...props}
      aria-label={label}
      title={props.title ?? label}
      className={cn(
        ICON_BUTTON_BASE,
        ICON_VARIANTS[variant],
        ICON_SIZES[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButtonLink({
  label,
  variant = "surface",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & {
  label: string;
  variant?: "surface" | "solid" | "brand" | "ghost";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Link
      {...props}
      aria-label={label}
      className={cn(
        ICON_BUTTON_BASE,
        ICON_VARIANTS[variant],
        ICON_SIZES[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}

const ICON_BUTTON_BASE =
  "inline-flex shrink-0 items-center justify-center rounded-full border " +
  "transition-[background-color,border-color,transform] duration-200 ease-out " +
  "active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 no-underline";

const ICON_VARIANTS = {
  surface:
    "bg-white border-[var(--border)] text-ink-700 hover:bg-paper-200 hover:text-ink-900",
  solid: "bg-ink-900 border-ink-900 text-white hover:bg-ink-800",
  brand: "bg-brand-600 border-brand-600 text-white hover:bg-brand-700",
  ghost:
    "bg-transparent border-transparent text-ink-500 hover:bg-paper-200 hover:text-ink-900",
} as const;

const ICON_SIZES = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-[3.25rem] w-[3.25rem]",
} as const;

// Surfaces -------------------------------------------------------------------

/**
 * Shadows are tinted with the brand teal rather than neutral black. A black shadow
 * on a warm ground reads as grey and slightly dirty; a tinted one disappears into
 * the palette, which is what "soft" actually means here.
 */
const CARD_SURFACE =
  "rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-card)]";

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

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("p-6 sm:p-7", className)} />;
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
        "flex flex-wrap items-start justify-between gap-3 px-6 pb-1 pt-6 sm:px-7 sm:pt-7",
        className,
      )}
    >
      <div className="min-w-0">
        <Heading
          id={id}
          className={cn(
            level === 2 ? "text-[1.35rem]" : "text-[1.1rem]",
            "font-medium tracking-[-0.02em]",
          )}
        >
          {title}
        </Heading>
        {description ? (
          <p className="mt-1.5 text-[0.9rem] text-ink-500">{description}</p>
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
            level === 1
              ? "text-2xl sm:text-3xl"
              : level === 2
                ? "text-xl"
                : "text-base",
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
  tone?: "neutral" | "brand" | "accent" | "track" | "attention" | "concern";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-paper-200 text-ink-600 border-transparent",
    brand: "bg-brand-50 text-brand-700 border-transparent",
    accent: "bg-brand-600 text-white border-transparent",
    track: "bg-track-50 text-track-600 border-transparent",
    attention: "bg-attention-50 text-attention-600 border-transparent",
    concern: "bg-concern-50 text-concern-600 border-transparent",
  }[tone];

  return (
    <span
      className={cn(
        // Sentence case, not uppercase: uppercase micro-labels are an enterprise
        // dashboard tell, and at this size they cost legibility for no gain.
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.76rem] font-medium",
        tones,
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Marks a row or screen as seeded demonstration data.
 * Renders nothing while product.prototype.showNotices is off.
 */
export function DemoBadge({ className }: { className?: string }) {
  if (!product.prototype.showNotices) return null;
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
    info: "border-transparent bg-paper-200 text-ink-700",
    caution: "border-attention-200 bg-attention-50 text-attention-600",
    privacy: "border-transparent bg-brand-50 text-brand-800",
    ai: "border-transparent bg-brand-50 text-brand-800",
  }[tone];

  const glyph = { info: "i", caution: "!", privacy: "◈", ai: "◆" }[tone];

  return (
    <div
      className={cn(
        "rounded-[1.125rem] border px-5 py-4 text-sm",
        tones,
        className,
      )}
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
          <div className={cn(title && "mt-1", "[&_a]:underline")}>
            {children}
          </div>
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
        "rounded-[1.5rem] border border-[var(--border)] bg-white/70 px-6 py-14 text-center",
        className,
      )}
    >
      <p className="text-[1.35rem] font-medium tracking-[-0.02em] text-ink-900">
        {title}
      </p>
      <p className="mx-auto mt-2.5 max-w-md text-[0.95rem] text-ink-500">
        {description}
      </p>
      {action ? <div className="mt-7">{action}</div> : null}
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
      <dt className="text-[0.82rem] font-medium text-ink-400">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-[1.9rem] font-medium leading-none tracking-[-0.03em]",
          valueTone,
        )}
      >
        {value}
      </dd>
      {detail ? (
        <p className="mt-1 text-[0.82rem] leading-snug text-ink-500">
          {detail}
        </p>
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
  tone = "brand",
}: {
  label: string;
  value: number;
  max?: number;
  valueText: string;
  tone?: "brand" | "track" | "attention" | "concern" | "unknown";
}) {
  const pct = max === 0 ? 0 : Math.max(0, Math.min(1, value / max)) * 100;
  /* Fill tones, matching ProgressBar and the wheel — a bar is a graphic, and the
     darker text tones read as heavy at this width. */
  const barTone = {
    brand: "bg-brand-600",
    track: "bg-track-400",
    attention: "bg-attention-400",
    concern: "bg-concern-400",
    unknown: "bg-unknown-400",
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
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-paper-300"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            barTone,
          )}
          style={{ width: `${pct}%` }}
        />
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
  const visible = items.filter(
    (item) => item.value !== null && item.value !== "",
  );
  if (visible.length === 0) return null;

  return (
    <dl className={cn("grid gap-x-6 gap-y-3 sm:grid-cols-2", className)}>
      {visible.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[0.82rem] font-medium text-ink-400">
            {item.label}
          </dt>
          <dd className="mt-1 text-[0.95rem] text-ink-800">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
