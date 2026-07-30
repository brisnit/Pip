"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";

/**
 * Copy-to-clipboard with a spoken confirmation.
 *
 * Falls back to a visible message when the Clipboard API is unavailable (older
 * browsers, or a non-secure origin) rather than silently doing nothing.
 */
export function CopyButton({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2500);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={copy}>
        {label}
      </Button>
      <span role="status" aria-live="polite" className="text-[0.8rem]">
        {state === "copied" ? (
          <span className="text-track-600">Copied</span>
        ) : state === "failed" ? (
          <span className="text-concern-600">
            Copying is unavailable — select the text instead
          </span>
        ) : (
          ""
        )}
      </span>
    </span>
  );
}
