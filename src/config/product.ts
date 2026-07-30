/**
 * Central product configuration.
 *
 * Everything user-visible about naming and institutional framing lives here so it
 * can be changed without touching feature code.
 */

export const product = {
  name: "Fuller Learning Companion",
  shortName: "Learning Companion",
  tagline: "Turn teaching into an ongoing conversation.",
  description:
    "An interactive teaching, learning, and student-support platform for Fuller Theological Seminary.",
  institution: {
    name: "Fuller Theological Seminary",
    shortName: "Fuller",
    /**
     * Text-based prototype lockup. No official Fuller logo asset is bundled with
     * this repository, and none is fetched at runtime. If licensed brand assets
     * are later added to /public, swap this for an <Image> in <BrandLockup>.
     */
    lockup: {
      primary: "FULLER",
      secondary: "Theological Seminary",
    },
  },
  prototype: {
    /** Shown in the persistent banner and on any screen displaying student data. */
    isPrototype: true,
    label: "Prototype",
    notice:
      "This is an unauthenticated prototype. It is not a secure student-record system and is not FERPA compliant. All students, courses, and results shown are demonstration data.",
    shortNotice: "Prototype — demonstration data only.",
    demoDataLabel: "Demonstration data",
  },
  support: {
    /** Used for the "who to contact" copy in support pathways. */
    taName: "Jonah Reyes",
    taRole: "Teaching Assistant",
    tutoringCenterName: "Fuller Academic Support Center",
  },
} as const;

/**
 * Public base URL used when generating student course links and QR codes.
 *
 * Server-side only — every caller renders on the server. That matters, because it
 * lets the value be read at *runtime* rather than baked in at build time.
 * `NEXT_PUBLIC_*` variables are inlined by Next during the build, so a deployment
 * whose hostname is only known once the service exists could never use one: the QR
 * codes would permanently point at whatever the build machine thought the URL was.
 *
 * Resolution order:
 *  1. `APP_URL` — set it explicitly and it always wins.
 *  2. `RENDER_EXTERNAL_URL` — injected by Render, so a deployment is correct with
 *     no configuration at all.
 *  3. `NEXT_PUBLIC_APP_URL` — kept for anyone already setting it.
 *  4. localhost, for development.
 */
export function appBaseUrl(): string {
  const candidate =
    process.env.APP_URL ??
    process.env.RENDER_EXTERNAL_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const trimmed = candidate.trim().replace(/\/+$/, "");
  // Render supplies a bare hostname in some configurations.
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function courseJoinUrl(accessCode: string): string {
  return `${appBaseUrl()}/join/${accessCode}`;
}
