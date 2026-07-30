import Image from "next/image";
import Link from "next/link";
import { product } from "@/config/product";
import { cn } from "@/lib/cn";

/**
 * The Fuller Seminary lockup, paired with the product name.
 *
 * Uses the supplied logo at public/brand/Fuller_Logo.png (1456×184, so 7.913:1).
 * Heights are set explicitly and the width derived from that ratio, which keeps the
 * mark crisp and reserves the right space before the image loads — no layout shift.
 *
 * The image carries the institution name, and "Learning Companion" is real text
 * beside it, so the surrounding link reads as "Fuller Seminary Learning Companion".
 *
 * `priority` is set because this sits in the masthead of every page: it is always
 * above the fold and should never lazy-load.
 */
const LOGO_RATIO =
  product.institution.logo.width / product.institution.logo.height;

const SIZES = {
  sm: { height: 20, product: "text-[0.82rem]", gap: "gap-2.5", rule: "h-5" },
  md: { height: 26, product: "text-[0.95rem]", gap: "gap-3", rule: "h-6" },
  lg: { height: 34, product: "text-lg", gap: "gap-3.5", rule: "h-8" },
} as const;

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
  const scale = SIZES[size];
  const height = scale.height;
  const width = Math.round(height * LOGO_RATIO);

  const inner = (
    <span className={cn("inline-flex items-center", scale.gap, className)}>
      <Image
        src={product.institution.logo.src}
        alt={product.institution.logo.alt}
        width={width}
        height={height}
        priority
        className="h-auto w-auto"
        style={{ height, width }}
      />
      {showProduct ? (
        <>
          <span
            aria-hidden="true"
            className={cn("w-px bg-tan-300", scale.rule)}
          />
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
      {inner}
    </Link>
  );
}
