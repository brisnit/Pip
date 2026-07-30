import Link from "next/link";
import { product } from "@/config/product";

/**
 * Persistent, non-dismissible prototype notice.
 *
 * It stays on every screen in both portals. A prototype that displays
 * student-shaped records should never let a viewer forget what they are looking
 * at, so this is deliberately not collapsible.
 */
export function PrototypeBanner({
  variant = "full",
}: {
  variant?: "full" | "compact";
}) {
  if (variant === "compact") {
    return (
      <p className="bg-ink-800 px-4 py-1.5 text-center text-[0.78rem] text-cream-200">
        <span className="font-semibold uppercase tracking-wide">
          {product.prototype.label}
        </span>{" "}
        · {product.prototype.shortNotice}
      </p>
    );
  }

  return (
    <div className="bg-ink-800 text-cream-200">
      <div className="mx-auto flex max-w-6xl flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2 text-[0.8rem] sm:px-6">
        <span className="rounded bg-cream-200 px-1.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide text-ink-800">
          {product.prototype.label}
        </span>
        <span className="min-w-0">{product.prototype.notice}</span>
        <Link
          href="/about"
          className="underline decoration-cream-200/50 underline-offset-2 hover:decoration-cream-200"
        >
          What this is and is not
        </Link>
      </div>
    </div>
  );
}
