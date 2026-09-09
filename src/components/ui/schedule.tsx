import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The schedule language: a time rail down the left, rounded event cards to the right.
 *
 * Taken from the reference's day view. Event types are distinguished by *tonal*
 * treatment rather than by a palette of colours — a tinted card, a plain white one, a
 * near-black one for the thing happening now — because a schedule with six hues stops
 * being scannable, which is the only thing a schedule is for.
 *
 * The rail is a real `<ol>`: these are ordered in time, and that ordering is
 * information a screen reader should get for free.
 */

export function Timeline({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ol className={cn("space-y-3", className)}>{children}</ol>;
}

export function ScheduleCard({
  time,
  meridiem,
  title,
  description,
  href,
  tone = "plain",
  badge,
  detail,
  className,
}: {
  /** The large figure on the rail — "9", "14 Sep". */
  time: ReactNode;
  /** The small unit beside it — "AM", "Sep". Optional. */
  meridiem?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  href?: string;
  /**
   * `now` is reserved for something happening at this moment. At most one per
   * timeline — its whole job is to be the only near-black card on the screen.
   */
  tone?: "plain" | "tonal" | "now";
  badge?: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  const surface = cn(
    "block flex-1 rounded-[1.5rem] p-5 transition-[box-shadow,transform] duration-200 ease-out",
    {
      plain:
        "border border-[var(--border)] bg-white shadow-[var(--shadow-card)]",
      tonal: "bg-brand-50",
      now: "bg-ink-900 text-white shadow-[var(--shadow-float)]",
    }[tone],
    href &&
      "no-underline hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]",
    className,
  );

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p
          className={cn(
            "min-w-0 text-[1.05rem] font-medium",
            tone === "now" ? "text-white" : "text-ink-900",
          )}
        >
          {title}
        </p>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>

      {description ? (
        <p
          className={cn(
            "mt-1 text-[0.9rem] leading-relaxed",
            tone === "now" ? "text-white/75" : "text-ink-500",
          )}
        >
          {description}
        </p>
      ) : null}

      {detail ? <div className="mt-4">{detail}</div> : null}
    </>
  );

  return (
    <li className="flex items-stretch gap-4">
      <div className="flex w-14 shrink-0 items-start justify-end pt-5 text-right">
        <span className="text-[1.15rem] font-medium leading-none text-ink-900">
          {time}
        </span>
        {meridiem ? (
          <span className="ml-1 text-[0.7rem] leading-none text-ink-400">
            {meridiem}
          </span>
        ) : null}
      </div>

      {href ? (
        <Link href={href} className={surface}>
          {body}
        </Link>
      ) : (
        <div className={surface}>{body}</div>
      )}
    </li>
  );
}
