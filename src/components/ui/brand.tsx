import Link from "next/link";
import { product } from "@/config/product";
import { cn } from "@/lib/cn";

/**
 * Text-based prototype brand lockup.
 *
 * No official Fuller Theological Seminary logo is bundled or fetched. This is a
 * typographic placeholder that identifies the institution by name without
 * reproducing protected brand assets. If licensed assets are added to /public,
 * replace the inner markup here and nothing else changes.
 */
export function BrandLockup({
  size = "md",
  href = "/",
  showProduct = true,
  className,
}: {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  showProduct?: boolean;
  className?: string;
}) {
  const scale = {
    sm: { rule: "text-[0.72rem]", name: "text-[0.6rem]", product: "text-[0.82rem]" },
    md: { rule: "text-sm", name: "text-[0.66rem]", product: "text-[0.95rem]" },
    lg: { rule: "text-lg", name: "text-[0.78rem]", product: "text-lg" },
  }[size];

  const inner = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-serif font-semibold tracking-[0.22em] text-burgundy-600",
            scale.rule,
          )}
        >
          {product.institution.lockup.primary}
        </span>
        <span
          className={cn(
            "mt-[0.2em] uppercase tracking-[0.16em] text-ink-500",
            scale.name,
          )}
        >
          {product.institution.lockup.secondary}
        </span>
      </span>
      {showProduct ? (
        <>
          <span aria-hidden="true" className="h-7 w-px bg-sand-200" />
          <span className={cn("font-serif text-ink-800", scale.product)}>
            {product.shortName}
          </span>
        </>
      ) : null}
    </span>
  );

  if (!href) return inner;

  return (
    <Link
      href={href}
      className="rounded-sm no-underline transition-opacity hover:opacity-80"
    >
      <span className="sr-only">
        {product.name} — {product.institution.name} prototype. Go to home.
      </span>
      <span aria-hidden="true">{inner}</span>
    </Link>
  );
}
