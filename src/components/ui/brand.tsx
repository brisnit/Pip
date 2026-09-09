import Image from "next/image";
import Link from "next/link";
import { product } from "@/config/product";
import { cn } from "@/lib/cn";

/**
 * The Predictive Learning lockup: the mark, with the product name as real text.
 *
 * The wordmark exists as an image too, but text is the better choice here — it is
 * set in Satoshi either way, and text scales with the viewport, wraps sensibly, gets
 * read aloud, and never renders as a broken picture. The mark carries the identity;
 * the name carries the meaning.
 *
 * `unoptimized` is deliberate, and was learned the hard way: it makes the src a plain
 * `/brand/mark-primary.png` rather than `/_next/image?url=…&w=…`. Query-string image
 * URLs are a routine casualty of privacy extensions and ad blockers, the optimiser
 * rejects widths outside its configured set, and it wants `sharp` on the host. For a
 * 33KB square already sized for its slot there is nothing to optimise, so the
 * machinery is pure risk — and this appears in the masthead of every screen, where it
 * has to be the most reliable image in the product rather than the cleverest.
 *
 * `priority` for the same reason: it should never lazy-load.
 */

const SIZES = {
  sm: {
    mark: 26,
    text: "text-[0.9rem]",
    gap: "gap-2.5",
    radius: "rounded-[7px]",
  },
  md: {
    mark: 32,
    text: "text-[1.02rem]",
    gap: "gap-3",
    radius: "rounded-[9px]",
  },
  lg: {
    mark: 40,
    text: "text-[1.2rem]",
    gap: "gap-3.5",
    radius: "rounded-[11px]",
  },
} as const;

export function BrandLockup({
  size = "md",
  href = "/",
  showProduct = true,
  variant = "primary",
  className,
}: {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  showProduct?: boolean;
  /** Which ground the mark sits on. `tonal` is the quiet one. */
  variant?: "primary" | "dark" | "tonal";
  className?: string;
}) {
  const scale = SIZES[size];
  const src =
    variant === "dark"
      ? product.institution.logo.dark
      : variant === "tonal"
        ? product.institution.logo.tonal
        : product.institution.logo.src;

  const inner = (
    <span className={cn("inline-flex items-center", scale.gap, className)}>
      <Image
        src={src}
        alt={showProduct ? "" : product.name}
        width={scale.mark}
        height={scale.mark}
        priority
        unoptimized
        className={cn(scale.radius, "shrink-0")}
      />
      {showProduct ? (
        <span
          className={cn(
            "font-medium leading-[1.05] tracking-[-0.03em] text-ink-900",
            scale.text,
          )}
        >
          {product.name}
        </span>
      ) : null}
    </span>
  );

  if (!href) return inner;

  return (
    <Link
      href={href}
      className="rounded-xl no-underline transition-opacity hover:opacity-75"
    >
      {inner}
    </Link>
  );
}
