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
     * The supplied Fuller Seminary lockup, rendered by <BrandLockup>.
     *
     * Provided by the project owner and served from our own origin — nothing is
     * fetched from a third party at runtime. Replacing it means dropping a new file
     * here and updating the ratio in <BrandLockup>.
     */
    logo: {
      /**
       * A 640×81 copy of the supplied lockup, downscaled from the 1456×184 original
       * that sits beside it. Displayed at most 34px tall, so 640px is already well
       * past 2× on a retina screen, and it halves the file size.
       */
      src: "/brand/fuller-logo.png",
      width: 640,
      height: 81,
      /** Alt text describes what the image depicts — the wordmark reads "Fuller
       *  Seminary", not the full legal name. */
      alt: "Fuller Seminary",
      /** The untouched asset as supplied, kept as the source of truth. */
      original: "/brand/Fuller_Logo.png",
    },
    styleGuide: "/brand/Style Guide.png",
  },
  prototype: {
    /**
     * Master switch for the prototype chrome: the persistent banner, the "demo data"
     * badges, and the in-page notices about this not being a real student-record
     * system.
     *
     * Off, because the application is being shown to stakeholders and that chrome
     * reads as noise rather than as candour in a live walkthrough. Setting this to
     * true restores every one of them — nothing was deleted.
     *
     * What it does NOT hide, deliberately: statements that would otherwise leave a
     * viewer with a false impression of what the software does. AI output stays
     * labelled as assembled rather than model-generated, materials still say no file
     * is stored, the live console still says it polls rather than streams, and
     * readiness is still described as not a grade. Hiding those would not be
     * presenting a prototype confidently; it would be misrepresenting it.
     */
    showNotices: false,

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
