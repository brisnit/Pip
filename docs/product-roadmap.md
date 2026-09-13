# Product roadmap

## Where this stands

Phases 1 through 6 of the brief are built and verified. Phase 7 — the production
foundations — is not started, and should not be until someone decides this
prototype is worth taking further.

| Phase | Status |
| --- | --- |
| 1. Foundation | Complete |
| 2. Professor course builder | Complete |
| 3. Student learning experience | Complete |
| 4. Readiness and professor insights | Complete |
| 5. Support recommendations | Complete |
| 6. AI layer | Complete as an abstraction with a deterministic provider |
| 7. Production foundations | Not started |

## What Phases 1–6 delivered

**Phase 1.** Greenfield audit. Next.js 16 / React 19 / TypeScript / Tailwind v4 /
SQLite. Product config in one file. Token-based design system with four accessible
status ramps. Landing, about, professor entry, join. 30-table relational schema.
Twelve-student seed with a real spread across all four readiness bands.
`PrototypeRoleContext` as the single identity boundary.

**Phase 2.** Course creation with objectives and modules. Syllabus intelligence:
paste, extract, review row by row, publish into course structure. Materials across
18 content types with objective and concept tagging and three visibility levels.
Lecture builder taking outline with timestamps, teaching notes, student notes,
transcript, key terms, scripture, objectives and comprehension questions. Real
server-side QR generation, copyable link, rotatable code, printable access card.

**Phase 3.** Join by QR, link or code with consent. The interactive lecture: video
provider abstraction with an honest placeholder, segment-anchored notes across ten
kinds, four comprehension markers with toggle semantics, five question kinds
including *ask for a simpler explanation* and *connect to an earlier lecture*,
bookmarks, upvoting, fifteen interactive-moment types, transcript, key terms with
perspective notes on contested claims, and a timeline annotated with the student's
own markers. Notes page with filters, grouping and study tools.

**Phase 4.** The readiness engine: eight signals, weight renormalisation, four
bands including *not enough information yet*, per-objective standing, confidence in
its own estimate, and a stated reason for every status. Roster with status filter,
sort, aggregate view and a legend. Student detail with every signal and its
observation, professor override with required explanation, and follow-up notes.
Comprehension dashboard with hardest checks, most confusing moments, reteach list
and question queue.

**Phase 5.** Five support pathways. A deterministic recommender that only ever
points at real published course rows. Student plan with accept, complete, decline
and request-another. Direct help requests with a two-sided preparation summary.
Professor view of engagement, and an append-only audit trail.

**Phase 6.** `AIProvider` interface with nine methods, provenance on every result,
a deterministic provider that calls no model and says so, row-level human review on
syllabus extraction, `NeedsReviewFrame` on course-wide drafts, no auto-import of
generated questions, and a hard line against scoring theological writing.

## Brand pass

Done after the initial build, once the Fuller Seminary style guide and logo were
supplied. The prototype had shipped with a placeholder palette (burgundy and cream)
and a typographic wordmark, both of which are now replaced: the six brand colours,
Noto Serif and Noto Sans, the real logo, and the guide's square tertiary-blue CTA.

Two accessibility problems surfaced during that pass and are fixed:

- The brand cyan and tan both fail contrast requirements in the obvious roles, so
  cyan never carries text and form controls use a darker tan. `npm run check:contrast`
  now guards all thirty pairings.
- Unstyled links inherited body colour with no underline — Tailwind's preflight
  behaviour — leaving them indistinguishable from text. This was true from the first
  commit and was only noticed while reworking the palette.

## Dashboard redesign

Both dashboards were worklists. They are now launchpads: the state of learning in
about five seconds, then a route into the detail.

- **A reusable visualisation system.** One `HealthWheel`, three uses. Built once,
  keyboard-reachable, glyph-labelled, colour-independent. See
  `product-architecture.md` for why the legend is the primary surface.
- **Pure aggregation** in `lib/domain/health.ts` — course bands, cohort bands and
  learning bands, with the thresholds in one place.
- **A faculty-sized seed.** Seven further courses and a shared roster, because a
  chart over one course is not a chart. 8 courses, 134 enrolments, a spread the
  readiness model earns rather than one written into the seed.
- **The worklists moved to the course page**, where they are course-scoped and
  actionable, rather than merged across eight courses on the dashboard.
- **Profiles for both roles**, field-driven from one definition so the form, the
  display and the completeness indicator cannot drift apart. Every field optional.

Known gaps: a student's enrolments are still matched by name, which is the same
weak heuristic joining a course uses and is documented at both call sites. It has to
become an account id under SSO — see 7.1.

## Hosting move: Render to Vercel

Moved off Render at the request of whoever has to look at it. The blocker was that
the prototype reads SQLite synchronously from local disk, which serverless hosting
cannot provide.

Resolved by swapping `better-sqlite3` for `libsql` — API-compatible, still
synchronous — and opening an embedded Turso replica when the environment supplies
one. Reads stay local and fast, writes go to a durable shared primary. No repository
function changed, and the readiness gather did not need the snapshot rework that a
network database would have forced.

Two compatibility gaps found and closed in `lib/db/driver.ts`, both now guarded in
`npm run verify`: thinner types on `prepare`, and no savepoint promotion for nested
transactions. The second is the one that mattered — its failure mode is a silent
rollback of the outer transaction.

Still true afterwards: seeding is a deliberate, out-of-band act rather than something
a cold start does. ~2,200 rows over the network would exceed any function timeout, so
the database is created from a locally seeded file.

Verified end to end against a live Turso database, not just reasoned about: the full
164-check smoke suite passes against it, the dashboard computes identical figures from
the replica, and writes made inside a transaction land on the primary. Three things
that only surfaced by actually doing it, all now handled:

- `turso db create --from-file` silently imports **nothing** from a WAL-mode SQLite
  file. It reports success and leaves the database empty. `npm run db:export` exists
  to produce a file that imports, and the README says to verify the row count.
- Two processes sharing one replica file corrupt each other through the native layer,
  and the server exits with no JavaScript stack. Replica paths now carry the process
  id.
- A replica whose primary has changed is rejected with `InvalidLocalGeneration`, which
  would otherwise fail every request permanently. The replica is disposable, so it is
  now discarded and re-pulled automatically.

## Visual redesign: Predictive Learning

A full design-system refactor, done through tokens and shared components rather than
page-by-page styling. Functionality, routes, data model, readiness logic, role
behaviour and the access gate were untouched throughout — the smoke suite that walks
the entire vertical slice still passes end to end.

- **New identity.** Five colours (`#0B0D16` / `#FFFFFF` / `#2F5BFF` / `#6C7A95` /
  `#A7C1FF`), Satoshi self-hosted, the mark from the supplied sheet paired with the
  product name as real text.
- **Pills, soft surfaces, minimal chrome.** 24–32px cards, translucent hairline
  borders, broad low-opacity shadows, and a cool near-white canvas with two very faint
  radial washes instead of a flat dashboard grey.
- **The primary button is near-black, not blue**, so saturated blue stays an accent
  worth noticing.
- **New shared components**: `IconButton`, `ProgressRing` / `ProgressBar` /
  `ProgressHeadline`, `FeatureCard`, `LearningCard`, `LessonRow`, `AIInsight`,
  `ScheduleCard` / `Timeline`, and an abstract SVG artwork system.
- **Floating mobile navigation**, four items maximum, 52px targets.

Three things worth remembering:

1. **The contrast script kept its own copy of the palette** and so passed against
   colours the app had stopped using. It now parses `globals.css` directly. It
   immediately found two real failures: the brand Slate is 4.33:1 on white and cannot
   carry body text, and four chart fills were under 3:1.
2. **Chart fills and text tones are different tokens.** The same green that reads as
   calm in a 14px label reads as a traffic light at 40px, and the first pass made the
   dashboard look like a different product.
3. **Nav icons are passed as names, not components.** Navigation is defined in server
   components and rendered by a client one; a React component is a function, which
   cannot cross that boundary.

## Performance pass

Measured before changing anything. Against a local file the app was already fast
(dashboard 40–90 ms), and dev-mode first compiles were 0.4–0.6 s, so neither was the
problem. The cost was in the hosted path:

- **Cold starts bootstrapping a replica of a database with history** — the dominant
  cost. 6.7–8.1 s to first sync on the live database, 0.4–0.7 s on identical data
  created fresh. Addressed operationally, by compaction (`npm run db:pull` → `db:export`
  → create → switch), not in code.
- **A write lock on every cold start** to check seeding. Now a plain read first.
- **Snapshot writes and replica syncs in front of the response.** Now after it, with
  snapshots batched into one statement.

Open: the production database has not been compacted yet — it needs a new database
and the Vercel environment variables updated, which is the owner's call. The live
site itself was not timed, for want of its URL; everything above was measured against
the same database from outside its region.

## Public access

The shared-password gate (`DEMO_ACCESS_PASSWORD`, `/unlock`, `src/proxy.ts`) was removed
entirely at the owner's request, along with its tests, smoke-suite support and Vercel
environment variable, and Vercel Deployment Protection was narrowed to previews and
per-deployment URLs so the production URL is public. Before it shipped: no debug or
admin routes exist, no secret reaches a client bundle, no source maps ship. The
consequence is stated in `docs/privacy-and-student-data-considerations.md`: with no
authentication, the professor portal is usable by any visitor, which is acceptable only
while every record is fictional.

## Production database compaction

Done on 2026-09-13 as a controlled migration. The live database was pulled read-only,
exported, and recreated as `pip-production`; the new database was pulled back and
compared table by table — schema, row counts, and a content digest of every row — and
matched exactly (86 schema objects, 47 tables, 2,341 rows) before any credential moved.
Vercel's `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` were swapped and production
redeployed; a session that existed only in the new database was recognised, and the old
database, pulled again after cutover, was unchanged — nothing was written to it in the
window. `fuller-learning-companion` is kept intact for rollback (see README).

Measured on production, same commit, same fresh-deploy method, before → after:

| | before | after |
| --- | --- | --- |
| cold professor dashboard | 5,764 ms | 1,679 ms |
| cold course insights | 6,848 ms | 2,760 ms |
| cold student home | 5,778 ms | 236 ms |
| warm route medians | 228–518 ms | 194–532 ms |
| student save, median | 3,165 ms | 1,164 ms |
| navigation right after a save, median / worst | 1,640 / 5,022 ms | 149 / 290 ms |

Five samples per figure over the public internet; differences of ~100 ms are noise.

### Page views stopped writing — measured

`6847c90` moved readiness history from page views to the actions that change its inputs
and put the activity log after the response. A/B on production, 8 runs each, both on
`pip-production`, switched with `vercel promote`:

| | before (`d6c0590`) | after (`6847c90`) |
| --- | --- | --- |
| student save, median | 1,801 ms | 1,577 ms |
| navigation right after a save, median | 220 ms | 159 ms |
| navigation stalls over 1.5 s | 2 (3.6 s, 3.5 s) | 1 (1.7 s) |
| remote-stream reconnects logged | 1 | 3 |

No regression, and fewer severe stalls, but within the noise of eight runs. It is not
what bounds write latency. Two measurements say what does:

- **Synchronous writes block the whole instance.** Two writes through the embedded
  replica took 846–933 ms (measured from outside the region), and the Node event loop
  was held for the entire time — every other request on that instance waited.
- **Remote streams expire often.** Production logged 1–3 reconnects in each eight-minute
  benchmark; each is a multi-second stall on whichever request meets it.

### Next step for write contention: a non-blocking write path (not yet made)

Measured on a throwaway copy of production, same machine, same database:

| write path | time | event loop held |
| --- | --- | --- |
| embedded replica (current), 2 writes | 846–933 ms | the whole time |
| `libsql/promise` replica | cannot be opened — its replica constructor fails in current `libsql` | — |
| `@libsql/client` over HTTP, 1 write | 59–68 ms | ≤ 6 ms |
| `@libsql/client`, batch of 4 writes | 61–114 ms | ≤ 7 ms |
| two such batches concurrently | 207 ms | ≤ 6 ms |

Recommendation: keep the embedded replica for reads, and send writes to the primary
through `@libsql/client`. It is roughly ten times faster per write from here, it does
not block the event loop — so a write in one request no longer stalls every other
request on the instance — it batches a request's writes into one round trip, and it
holds no long-lived stream to expire.

The trade-offs, which are why this is a decision rather than a patch:

- A write made over HTTP reaches the local replica on its next sync. A page that must
  show a write it has just made syncs first — one incremental round trip, cheap next to
  today's cost. Writes nothing on screen waits for (history, the activity log, the
  session touch) become fire-and-forget after the response.
- Repository write functions become `async`, which touches every server action, and
  the seed and scripts need a synchronous path kept alongside for local files.

## Immediate follow-ups

Small, and worth doing before the next feature.

1. **A unit test runner.** The readiness and support models are already pure
   functions with explicit inputs; Vitest over them would give a fast per-function
   loop that the two current suites cannot.
2. **Resolve the 12 dependency advisories** reported by `create-next-app` at
   scaffold time. Not investigated.
3. **Course editing.** A course can be created but not edited. Same for lectures and
   materials — the create paths exist, the update paths do not.
4. **`git init` and a first commit.** Not done, deliberately.
5. **A migration tool** before the first schema change that must preserve data.
   Right now the reset path is "delete the file".
6. **Interactive-moment authoring beyond comprehension questions.** All fifteen
   types render and score correctly, but only comprehension questions can be
   authored in the lecture builder; the rest exist in seed data and can only be
   published or held back from the live console.

## Phase 7: production foundations

Ordered by dependency, not by appeal. Nothing after step 1 is safe without step 1.

### 7.1 Authentication and authorisation — blocking

Institutional SSO, a policy layer, course-scoped checks on every route and action,
object-level authorisation, session revocation, rate limiting on join and on writes.
Full detail in `future-authentication-plan.md`.

Nothing else in Phase 7 should ship first. An unauthenticated system with better
features is a worse system.

### 7.2 Teaching-assistant and administrator roles

The support model already routes work to a named teaching assistant who currently
has no way to see it. The TA role is the more urgent of the two: assigned courses,
questions, support requests, no readiness overrides.

### 7.3 FERPA, security and accessibility review

Registrar and counsel review. Information security review covering hosting,
encryption at rest and in transit, backups and incident response. Access audit
logging — distinct from the activity log that exists — before any real data is
loaded. Independent accessibility audit; the current work targets WCAG 2.2 AA and
has been built carefully, but it has not been tested with real assistive
technology or real users.

### 7.4 Real storage

Object storage for uploads, with virus scanning, size and type limits, signed
time-limited URLs, and a retention policy. Today materials record filename and size
only, and every surface says so.

### 7.5 LMS integration

If the institution runs Canvas or similar, most of the course-structure entry in this
prototype is duplicate work. LTI 1.3 for launch and roster sync would remove it.
Grade passback should be considered and probably declined — readiness is not a
grade, and connecting it to a gradebook would make it one.

### 7.6 Real-time infrastructure

The live console polls every 15 seconds and says so on screen. Replacing
`LivePoller` with a subscription is a contained change. Worth doing when a professor
actually uses live mode with a full class, not before.

### 7.7 Scheduling and notifications

Support requests currently create internal records and nothing else — no email, no
SMS, no calendar. Real office-hours booking needs calendar integration, and
notifications need a delivery service plus a student preference model. Both should
be opt-in.

### 7.8 A real AI provider

Sequenced in `ai-integration-plan.md`: syllabus extraction first, then
transcription and summarisation, then question drafting, then student study
material. Blocked on a data-processing agreement, because sending student activity
to a third party is a disclosure of education records.

## Beyond Phase 7

Speculative. Listed so they are not mistaken for commitments.

**Longitudinal readiness across courses.** Valuable to advisers, and a significant
escalation in what the system knows about a student. Needs its own governance
conversation before any engineering.

**Model calibration.** The thresholds and weights are considered defaults, not
findings. With real outcome data they could be validated — and would need to be
before anyone treats a status as meaningful.

**Faculty-configurable weights.** Lets a professor say that in *their* course
confidence matters more than recall. Also lets a professor produce a model nobody
can defend. Would need guard rails.

**Native mobile.** The web app is responsive; a wrapper would add little. Native
would earn its place only for offline lecture note-taking, which is a real need in
rooms with bad connectivity.

**Apple Watch.** Named in the brief as out of scope. It remains hard to see what a
watch adds to reading theology.

**Cohort comparison.** Comparing this term's class against previous terms. Useful to
a professor refining a course; a short step from ranking students, which this
product should not do.

## What should not be built

Recorded because the pressure to build them will be real.

**Attendance scoring.** The readiness model excludes presence-only signals
deliberately. Adding attendance weight would be a one-line change and would break
the model's central claim.

**Automated essay grading.** `HUMAN_GRADED_ASSESSMENT_TYPES` exists to prevent this.
A tool that helps a professor read is welcome; a judgement presented as
authoritative is not.

**Behavioural telemetry.** No page views, dwell time or scroll depth. Only
deliberate student actions are recorded. This is what makes the product's privacy
claims true rather than aspirational.

**Readiness in a gradebook.** Would convert a formative signal into a summative one
and destroy the honest self-report the model depends on.

**Ranking students against each other.** The product's premise is that a student's
readiness is a question about them and the material, not about their classmates.

**Notifying anyone other than the student and their professor** about a readiness
status, without a governance decision that explicitly authorises it.
