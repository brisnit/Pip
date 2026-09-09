/**
 * Central product configuration.
 *
 * Everything user-visible about naming and institutional framing lives here so it
 * can be changed without touching feature code.
 */

export const product = {
  name: "Predictive Learning",
  shortName: "Predictive Learning",
  tagline: "Personalised learning. Real progress.",
  strapline: "Learn · Grow · Achieve",
  description:
    "AI-powered training that adapts to every learner, builds confidence, and drives real results.",
  institution: {
    name: "Predictive Learning",
    shortName: "Predictive Learning",
    /**
     * The mark, in the three variants the brand sheet defines.
     *
     * <BrandLockup> pairs the mark with the product name as real text rather than
     * using the full wordmark image: the type is Satoshi either way, and text scales,
     * translates and reads to a screen reader in a way a picture of a word does not.
     * The full lockup is kept for places that want the drawn wordmark.
     *
     * All four are cropped from the supplied sheet at public/brand/Logo.png and
     * served from our own origin — nothing is fetched from a third party.
     */
    logo: {
      /** Blue ground, white mark. The default. */
      src: "/brand/mark-primary.png",
      width: 192,
      height: 192,
      alt: "Predictive Learning",
      /** Near-black ground, for use on pale surfaces that need more weight. */
      dark: "/brand/mark-dark.png",
      /** Pale blue ground, blue mark. For quiet placements. */
      tonal: "/brand/mark-tonal.png",
      /** Mark plus drawn wordmark, 720×206. */
      lockup: "/brand/logo-lockup.png",
      /** The untouched sheet as supplied, kept as the source of truth. */
      original: "/brand/Logo.png",
    },
    styleGuide: "/brand/New_Style.png",
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
 *  2. `VERCEL_PROJECT_PRODUCTION_URL` — the project's stable production hostname on
 *     Vercel. Preferred over `VERCEL_URL`, which is the *deployment* hostname and
 *     changes on every push: a QR code printed from a preview build would stop
 *     resolving the moment the next deployment replaced it.
 *  3. `VERCEL_URL` — so preview deployments still generate links that work.
 *  4. `RENDER_EXTERNAL_URL` — injected by Render.
 *  5. `NEXT_PUBLIC_APP_URL` — kept for anyone already setting it.
 *  6. localhost, for development.
 */
export function appBaseUrl(): string {
  const candidate =
    process.env.APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    process.env.RENDER_EXTERNAL_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const trimmed = candidate.trim().replace(/\/+$/, "");
  // Vercel supplies a bare hostname, and Render does in some configurations.
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function courseJoinUrl(accessCode: string): string {
  return `${appBaseUrl()}/join/${accessCode}`;
}
