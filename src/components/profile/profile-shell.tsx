import Image from "next/image";
import type { ReactNode } from "react";
import { Meter } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import type { Completeness, ProfileField } from "@/lib/repositories/profiles";
import { initials } from "@/lib/repositories/profiles";

/**
 * Shared chrome for both profiles.
 *
 * The completeness meter is deliberately framed as progress rather than as a nag:
 * it says what is filled and lists what is left, and never blocks anything. Every
 * field is optional by design.
 */
export function ProfileHeader({
  name,
  subtitle,
  photoUrl,
  completeness,
  action,
}: {
  name: string;
  subtitle?: string | null;
  photoUrl?: string | null;
  completeness: Completeness;
  action?: ReactNode;
}) {
  return (
    <header className="rounded-2xl border border-tan-100 bg-white p-6 shadow-soft sm:p-8">
      <div className="flex flex-wrap items-start gap-6">
        <Avatar name={name} photoUrl={photoUrl} />

        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-3xl leading-tight">{name}</h1>
          {subtitle ? (
            <p className="mt-1.5 text-[0.95rem] text-ink-500">{subtitle}</p>
          ) : null}

          <div className="mt-5 max-w-sm">
            <Meter
              label="Profile completeness"
              value={completeness.filled}
              max={completeness.total}
              valueText={`${completeness.filled} of ${completeness.total} filled`}
              tone={completeness.share >= 0.75 ? "track" : "brand"}
            />
            {completeness.missing.length > 0 ? (
              <p className="mt-2 text-[0.8rem] text-ink-400">
                Still empty: {completeness.missing.slice(0, 4).join(", ")}
                {completeness.missing.length > 4
                  ? `, and ${completeness.missing.length - 4} more`
                  : ""}
                .
              </p>
            ) : (
              <p className="mt-2 text-[0.8rem] text-track-600">
                Everything filled in.
              </p>
            )}
          </div>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

/**
 * Photo where one is given, initials where one is not.
 *
 * `unoptimized` for the same reason the logo is: an arbitrary user-supplied URL
 * through the image optimiser is a request that can fail in ways the page cannot
 * recover from, and this is decoration.
 */
export function Avatar({
  name,
  photoUrl,
  size = 88,
  className,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const shared = cn(
    "shrink-0 overflow-hidden rounded-full border border-tan-200 bg-brand-50",
    className,
  );

  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt=""
        width={size}
        height={size}
        unoptimized
        className={cn(shared, "object-cover")}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        shared,
        "flex items-center justify-center font-serif text-brand-600",
      )}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials(name)}
    </span>
  );
}

/** Read-only rendering of a set of profile fields. */
export function ProfileSection<T extends Record<string, unknown>>({
  title,
  row,
  fields,
}: {
  title: string;
  row: T;
  fields: ProfileField<T>[];
}) {
  const filled = fields.filter((field) => {
    const value = row[field.key];
    return typeof value === "string" && value.trim().length > 0;
  });

  if (filled.length === 0) return null;

  return (
    <section className="rounded-2xl border border-tan-100 bg-white p-6 shadow-[0_1px_3px_rgba(4,43,50,0.04)] sm:p-8">
      <h2 className="font-serif text-xl">{title}</h2>
      <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {filled.map((field) => (
          <div
            key={field.key}
            className={cn("min-w-0", field.long && "sm:col-span-2")}
          >
            <dt className="text-[0.78rem] font-medium uppercase tracking-wide text-ink-400">
              {field.label}
            </dt>
            <dd
              className={cn(
                "mt-1 text-ink-800",
                field.long
                  ? "whitespace-pre-line text-[0.92rem] leading-relaxed"
                  : "text-[0.95rem]",
              )}
            >
              {field.type === "url" && field.key !== "photo_url" ? (
                <a
                  href={String(row[field.key])}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {String(row[field.key])}
                </a>
              ) : (
                String(row[field.key])
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
