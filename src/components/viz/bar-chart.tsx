"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * The horizontal bar chart: the app's form for "compare magnitude, low to high".
 *
 * It replaced a stack of ad-hoc meters that each coloured themselves by their own
 * value — red when high, amber when low. That is double-encoding: bar length already
 * says how big the number is, so spending the colour channel on it too buys nothing
 * and costs the one free channel a chart has. These categories (objectives, questions)
 * are *nominal* — LO2 is not "more" than LO1 — so every bar wears one hue and length
 * alone carries magnitude.
 *
 * ── The specs this follows ───────────────────────────────────────────────────
 *
 *   marks      thin (10px), 4px rounded at the data end, square at the baseline
 *   track      a lighter step of the same ramp, so state reads across the whole bar
 *   grid       none — every bar is directly labelled, and direct labels come before
 *              gridlines. A grid here would be ink that is not data.
 *   colour     one hue for every bar; sequential steps only where the categories
 *              genuinely have an order
 *   text       always a text token, never the series colour
 *   legend     none — a single series is named by the card's own title, and a legend
 *              box with one swatch just restates it
 *
 * Values are readable three ways — the label at the tip, the tooltip, and the table
 * view — so nothing is gated behind a hover.
 */

export type BarDatum = {
  key: string;
  /** The category. Truncated in the row; the tooltip and table show it in full. */
  label: string;
  /** 0–1 once divided by `max`. */
  value: number;
  /** Defaults to 1, i.e. `value` is already a share. */
  max?: number;
  /** The direct label at the tip. Written by the caller, because only the page
   *  knows whether "3 of 12" or "25%" is the honest phrasing. */
  valueText: string;
  /** A quieter second line — where a question came from, for instance. */
  caption?: string;
};

export function HBarChart({
  data,
  /** Names the quantity for assistive technology, e.g. "students needing review". */
  measure,
  emphasis,
  className,
}: {
  data: BarDatum[];
  measure: string;
  /**
   * The key of the one row that is the story, if there is one. Everything else
   * recedes to the de-emphasis step — the most underused form in the book, and
   * usually the honest answer to "make this chart clearer".
   */
  emphasis?: string;
  className?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const tableId = useId();

  if (data.length === 0) return null;

  return (
    <div className={cn("min-w-0", className)}>
      <ul className="space-y-3.5" onMouseLeave={() => setActive(null)}>
        {data.map((row) => {
          const max = row.max ?? 1;
          const share =
            max === 0 ? 0 : Math.max(0, Math.min(1, row.value / max));
          const isActive = active === row.key;
          const dimmed = emphasis !== undefined && row.key !== emphasis;

          return (
            <li
              key={row.key}
              // The hit target is the whole row, not the 10px bar — a pinpoint
              // target on a thin mark is its own anti-pattern.
              onMouseEnter={() => setActive(row.key)}
              onFocus={() => setActive(row.key)}
              onBlur={() => setActive(null)}
              tabIndex={0}
              aria-label={`${row.label}: ${row.valueText}`}
              className={cn(
                "min-w-0 rounded-[0.75rem] px-2 py-1.5 transition-colors",
                isActive && "bg-paper-100",
              )}
            >
              <div className="flex items-baseline justify-between gap-4">
                <span
                  className={cn(
                    "min-w-0 text-[0.9rem] text-ink-700",
                    isActive ? "" : "truncate",
                  )}
                >
                  {row.label}
                </span>
                <span className="shrink-0 text-[0.85rem] tabular-nums text-ink-500">
                  {row.valueText}
                </span>
              </div>

              <div
                className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-brand-100"
                role="meter"
                aria-label={`${row.label}: ${measure}`}
                aria-valuenow={Math.round(share * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={row.valueText}
              >
                <div
                  className={cn(
                    // Square where it leaves the baseline, rounded at the data end.
                    "h-full rounded-l-none rounded-r-[4px] transition-[width,background-color] duration-500 ease-out",
                    dimmed ? "bg-slate-300" : "bg-brand-600",
                  )}
                  // A zero-width sliver is invisible; a hairline says "nearly none".
                  style={{ width: share === 0 ? 2 : `${share * 100}%` }}
                />
              </div>

              {row.caption ? (
                <p className="mt-1.5 text-[0.78rem] text-ink-400">
                  {row.caption}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/*
        The table twin. Every chart with more than one row has one: it is the
        WCAG-clean equivalent, and it is where a value lives when a label is truncated.
        A <details> keeps it out of the way without keeping it out of reach.

        A single-row chart skips it — a one-row table restates the row it sits under,
        and where this component is used that way the surrounding card already lists
        the detail in full underneath.
      */}
      {data.length > 1 ? (
        <details className="mt-4 px-2">
          <summary className="cursor-pointer list-none text-[0.8rem] text-ink-400 transition-colors hover:text-ink-700">
            View as a table
          </summary>
          <table id={tableId} className="mt-3 w-full text-left text-[0.85rem]">
            <thead>
              <tr className="border-b border-[var(--border)] text-ink-400">
                <th scope="col" className="pb-1.5 font-medium">
                  Item
                </th>
                <th scope="col" className="pb-1.5 text-right font-medium">
                  {measure}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.key}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <th
                    scope="row"
                    className="py-2 pr-4 font-normal text-ink-700"
                  >
                    {row.label}
                    {row.caption ? (
                      <span className="block text-[0.78rem] text-ink-400">
                        {row.caption}
                      </span>
                    ) : null}
                  </th>
                  <td className="py-2 text-right tabular-nums text-ink-800">
                    {row.valueText}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </div>
  );
}
