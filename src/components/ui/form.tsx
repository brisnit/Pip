import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * slate-500 rather than a lighter tan: WCAG 1.4.11 asks for 3:1 on the boundary of an
 * interactive control, and the brand tan only reaches 1.9:1 against white. This is
 * 3.55:1. Decorative dividers elsewhere keep the lighter tans.
 */
/**
 * The shared control surface.
 *
 * Rounded to the small radius rather than the pill: a pill-shaped text field with a
 * long value looks like a search box, and these hold sentences. The border is
 * slate-500 rather than the hairline because WCAG 1.4.11 wants 3:1 on the boundary of
 * something you can interact with, and the hairline is deliberately below that.
 *
 * 44px minimum height, so every field is a comfortable touch target.
 */
const CONTROL =
  "w-full min-h-11 rounded-[0.75rem] border border-slate-500 bg-white px-4 py-2.5 text-ink-900 " +
  "transition-[border-color,box-shadow] duration-200 " +
  "hover:border-ink-400 focus:border-brand-600 " +
  "placeholder:text-ink-400 disabled:bg-paper-200 disabled:text-ink-400 disabled:hover:border-slate-500";

/**
 * Labelled field wrapper.
 *
 * Errors are tied to the control with aria-describedby and aria-invalid, and the
 * hint and error ids are derived from the field id so callers cannot forget them.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean | undefined;
    required: boolean | undefined;
  }) => ReactNode;
  className?: string;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink-700">
        {label}
        {required ? (
          <>
            {" "}
            <span className="text-brand-600" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(required)</span>
          </>
        ) : (
          <span className="ml-1.5 text-[0.78rem] font-normal text-ink-400">
            optional
          </span>
        )}
      </label>
      {hint ? (
        <p id={hintId} className="mt-1 text-[0.82rem] text-ink-500">
          {hint}
        </p>
      ) : null}
      <div className="mt-1.5">
        {children({
          id,
          "aria-describedby": describedBy,
          "aria-invalid": error ? true : undefined,
          required: required || undefined,
        })}
      </div>
      {error ? (
        <p
          id={errorId}
          className="mt-1.5 flex gap-1.5 text-[0.82rem] font-medium text-concern-600"
        >
          <span aria-hidden="true">!</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={cn(CONTROL, className)} />;
}

export function TextArea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cn(CONTROL, "min-h-24 leading-relaxed", className)}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <select {...props} className={cn(CONTROL, "pr-8", className)}>
      {children}
    </select>
  );
}

export function Checkbox({
  id,
  label,
  hint,
  className,
  ...props
}: ComponentProps<"input"> & {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex gap-2.5", className)}>
      <input
        {...props}
        id={id}
        type="checkbox"
        aria-describedby={hintId}
        className="mt-0.5 h-[1.15rem] w-[1.15rem] shrink-0 rounded-[0.3rem] border-slate-500 accent-brand-600"
      />
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm text-ink-700">
          {label}
        </label>
        {hint ? (
          <p id={hintId} className="mt-0.5 text-[0.82rem] text-ink-500">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Radio group rendered as a fieldset so the group label is announced. */
export function RadioGroup({
  name,
  legend,
  hint,
  options,
  defaultValue,
  required,
  className,
}: {
  name: string;
  legend: ReactNode;
  hint?: ReactNode;
  options: { value: string; label: ReactNode; description?: ReactNode }[];
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="text-sm font-medium text-ink-700">{legend}</legend>
      {hint ? <p className="mt-1 text-[0.82rem] text-ink-500">{hint}</p> : null}
      <div className="mt-2 space-y-2">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          return (
            <div key={option.value} className="flex gap-2.5">
              <input
                type="radio"
                id={id}
                name={name}
                value={option.value}
                defaultChecked={defaultValue === option.value}
                required={required}
                className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
              />
              <div className="min-w-0">
                <label htmlFor={id} className="text-sm text-ink-800">
                  {option.label}
                </label>
                {option.description ? (
                  <p className="mt-0.5 text-[0.82rem] text-ink-500">
                    {option.description}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Announces a server-action result to assistive technology. */
export function FormStatus({
  message,
  tone = "success",
}: {
  message: string | null | undefined;
  tone?: "success" | "error";
}) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "text-sm",
        !message && "sr-only",
        tone === "error" ? "text-concern-600" : "text-track-600",
      )}
    >
      {message ?? ""}
    </p>
  );
}
