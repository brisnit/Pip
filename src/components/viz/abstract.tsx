import { cn } from "@/lib/cn";

/**
 * The abstract artwork system.
 *
 * The brand board's hero imagery is dimensional: spheres, tubes and connected forms
 * in blue glass. These are the flat-vector equivalent — soft overlapping shapes with
 * radial gradients that read as lit volumes without pretending to be renders.
 *
 * Why SVG rather than images: they are a few hundred bytes, scale to any card, take
 * their colours from the token layer, and never arrive late or broken. A 3D render
 * would look better in a still; this looks better in a product that has to load.
 *
 * All of it is `aria-hidden`. These carry mood, not information — anything a viewer
 * needs to know is written in the card beside them. They also sit behind content, so
 * every one is `pointer-events-none`.
 *
 * Each motif means something in context, loosely:
 *   orbit    a path being followed — progress, a journey
 *   cluster  connected knowledge, things relating to each other
 *   flow     a sequence, a route through material
 *   bloom    growth, capability opening up
 */

export type Motif = "orbit" | "cluster" | "flow" | "bloom";

export function AbstractArt({
  motif = "orbit",
  className,
  seedId,
}: {
  motif?: Motif;
  className?: string;
  /** Distinguishes gradient ids when several appear on one page. */
  seedId?: string;
}) {
  const id = `${motif}-${seedId ?? "a"}`;

  return (
    <svg
      viewBox="0 0 240 240"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none select-none", className)}
    >
      <defs>
        {/* A lit sphere: bright toward the top left, deepening away from it. */}
        <radialGradient id={`${id}-sphere`} cx="32%" cy="26%" r="78%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="34%" stopColor="var(--color-brand-300)" />
          <stop offset="100%" stopColor="var(--color-brand-700)" />
        </radialGradient>
        <radialGradient id={`${id}-sphere-pale`} cx="34%" cy="24%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="46%" stopColor="#e8efff" />
          <stop offset="100%" stopColor="var(--color-brand-300)" />
        </radialGradient>
        <linearGradient id={`${id}-tube`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-300)" />
          <stop offset="55%" stopColor="var(--color-brand-500)" />
          <stop offset="100%" stopColor="var(--color-brand-700)" />
        </linearGradient>
        {/* Softens edges so the shapes read as glass rather than as cut paper. */}
        <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {motif === "orbit" ? (
        <>
          <ellipse
            cx="120"
            cy="122"
            rx="86"
            ry="86"
            fill="none"
            stroke="var(--color-brand-300)"
            strokeWidth="1.5"
            opacity="0.55"
          />
          <ellipse
            cx="120"
            cy="122"
            rx="86"
            ry="34"
            fill="none"
            stroke="var(--color-brand-400)"
            strokeWidth="10"
            strokeLinecap="round"
            opacity="0.35"
            transform="rotate(-24 120 122)"
          />
          <circle cx="120" cy="122" r="52" fill={`url(#${id}-sphere)`} />
          <circle
            cx="188"
            cy="82"
            r="17"
            fill={`url(#${id}-sphere-pale)`}
            opacity="0.95"
          />
          <circle
            cx="49"
            cy="163"
            r="11"
            fill="var(--color-brand-600)"
            opacity="0.8"
          />
        </>
      ) : null}

      {motif === "cluster" ? (
        <>
          <circle
            cx="96"
            cy="104"
            r="60"
            fill={`url(#${id}-sphere)`}
            filter={`url(#${id}-soft)`}
            opacity="0.5"
          />
          <circle cx="104" cy="98" r="46" fill={`url(#${id}-sphere)`} />
          <circle cx="166" cy="146" r="38" fill={`url(#${id}-sphere-pale)`} />
          <circle
            cx="62"
            cy="172"
            r="24"
            fill="var(--color-brand-500)"
            opacity="0.85"
          />
          <path
            d="M104 98 L166 146 M104 98 L62 172 M166 146 L62 172"
            stroke="var(--color-brand-400)"
            strokeWidth="1.5"
            opacity="0.5"
            fill="none"
          />
        </>
      ) : null}

      {motif === "flow" ? (
        <>
          <path
            d="M18 186 C 66 186, 62 108, 112 108 S 178 46, 224 46"
            fill="none"
            stroke={`url(#${id}-tube)`}
            strokeWidth="26"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M18 186 C 66 186, 62 108, 112 108 S 178 46, 224 46"
            fill="none"
            stroke="#ffffff"
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.35"
          />
          <circle cx="224" cy="46" r="18" fill={`url(#${id}-sphere-pale)`} />
          <circle cx="18" cy="186" r="12" fill="var(--color-brand-700)" />
        </>
      ) : null}

      {motif === "bloom" ? (
        <>
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <ellipse
              key={angle}
              cx="120"
              cy="76"
              rx="26"
              ry="52"
              fill="var(--color-brand-400)"
              opacity="0.28"
              transform={`rotate(${angle} 120 120)`}
            />
          ))}
          <circle cx="120" cy="120" r="38" fill={`url(#${id}-sphere)`} />
          <circle cx="120" cy="120" r="14" fill="#ffffff" opacity="0.85" />
        </>
      ) : null}
    </svg>
  );
}

/**
 * A hero backdrop: artwork bled off the corner of a card, with a wash behind it.
 *
 * Absolutely positioned and inert, so it never affects the layout of the card it
 * decorates and never intercepts a click meant for the content on top.
 */
export function ArtBackdrop({
  motif = "orbit",
  seedId,
  className,
}: {
  motif?: Motif;
  seedId?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        /*
          Smaller and pushed further off-canvas on narrow screens. At full size it
          reached into the middle of the card and sat behind the headline, which is
          the one thing a decorative backdrop must never do — the type has to win.
        */
        "pointer-events-none absolute -right-16 -top-10 h-40 w-40 opacity-80",
        "sm:-right-8 sm:-top-14 sm:h-64 sm:w-64 sm:opacity-90",
        "lg:h-72 lg:w-72",
        className,
      )}
    >
      <AbstractArt motif={motif} seedId={seedId} className="h-full w-full" />
    </div>
  );
}
