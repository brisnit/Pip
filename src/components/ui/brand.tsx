import Image from "next/image";
import Link from "next/link";
import { product } from "@/config/product";
import { cn } from "@/lib/cn";

/**
 * The Fuller Seminary lockup, paired with the product name.
 *
 * Heights are set explicitly and the width derived from the asset's ratio, so the
 * right space is reserved before the image loads — no layout shift.
 *
 * The image carries the institution name, and "Learning Companion" is real text
 * beside it, so the surrounding link reads as "Fuller Seminary Learning Companion".
 *
 * `priority`, because this sits in the masthead of every page and should never
 * lazy-load.
 *
 * `unoptimized` is deliberate. It makes the src a plain `/brand/fuller-logo.png`
 * instead of `/_next/image?url=…&w=…`, which matters for three reasons: query-string
 * image URLs are a common casualty of privacy extensions and ad blockers, the
 * optimiser rejects widths outside its configured set, and it needs `sharp` on the
 * host. For a 21KB asset already sized for its slot there is nothing to optimise, so
 * the machinery is pure risk. The lockup appears on every screen — it has to be the
 * most reliable image in the app, not the cleverest.
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
        unoptimized
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
