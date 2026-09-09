# Product architecture

## The loop the product exists to close

1. The professor publishes material and lectures with comprehension checks.
2. The student works inside the lecture and records what lands and what does not.
3. The application measures that activity against learning objectives.
4. The student gets specific, explained feedback.
5. The professor sees where individuals and the class are struggling.
6. The application recommends an intervention drawn from real course material.
7. Both act before the student falls behind.

Every architectural decision below serves step 3 and step 6, because those are
where this kind of product usually goes wrong — either by measuring the wrong
thing (attendance, clicks) or by recommending something generic.

## Layering

```
┌─ app/                    routes, server components, server actions
│    reads from repositories, calls domain functions, renders
├─ components/             presentation only; no data access
├─ lib/domain/             PURE functions: readiness, support, vocabulary
│    no imports from db, no globals, no I/O
├─ lib/repositories/       SQL. Typed rows in, typed rows out.
├─ lib/ai/                 provider interface + deterministic implementation
├─ lib/role/               PrototypeRoleContext — the only "who is acting" answer
└─ lib/db/                 schema, connection, seed, id generation
```

The rule that matters: **`lib/domain/` is pure.** `readiness.ts` and `support.ts`
take explicit input structs and return explicit results. They touch no database,
read no globals, and call no clock except through their inputs. That is what makes
the readiness model arguable — you can read the whole thing in one file and check
the arithmetic — and it is why `scripts/verify-prototype.mts` can assert on it
directly.

Repositories are the only place SQL lives. Server modules carry
`import "server-only"`, so importing one from a client component is a build error
rather than a runtime leak.

## Routes

### Public
| Route | Purpose |
| --- | --- |
| `/` | Landing. Two doors: professor portal, student portal. |
| `/about` | What the prototype is and, at length, what it is not. |
| `/professor` | Professor entry. Redirects to the dashboard; becomes the sign-in screen later. |
| `/join` | Enter a course code, with an accessible alternative to scanning. |
| `/join/[courseCode]` | Course preview, name + consent, then into the portal. |

### Professor
| Route | Purpose |
| --- | --- |
| `/professor/dashboard` | Launchpad. Course health and student health as two wheels, and one way to start a course. |
| `/professor/courses` | All courses with access codes, counts and a health band; filterable by band. |
| `/professor/students` | Faculty-wide roster across every course, filterable by cohort band. |
| `/professor/profile` | The professor's own profile, with a completeness indicator. |
| `/professor/courses/new` | Course creation. Issues code, link, QR, access card. |
| `/professor/courses/[id]` | Overview: access panel, setup checklist, class understanding, students to follow up, open questions, what is coming, recent activity, modules, objectives. |
| `/professor/courses/[id]/access-card` | Printable card with QR, URL and code. |
| `/professor/courses/[id]/syllabus` | Syllabus intelligence: extract → review → publish. |
| `/professor/courses/[id]/content` | Lectures and materials; visibility control. |
| `/professor/courses/[id]/lectures/new` | Lecture builder: outline, notes, transcript, terms, scripture, objectives, checks. |
| `/professor/courses/[id]/lectures/[lid]/live` | Live console. |
| `/professor/courses/[id]/students` | Roster with status, filter, sort, aggregate view. |
| `/professor/courses/[id]/students/[sid]` | Student detail, evidence, override, notes, support. |
| `/professor/courses/[id]/insights` | Comprehension dashboard, questions, reteach list. |
| `/professor/courses/[id]/assessments` | Assessments, results, AI drafting. |
| `/professor/courses/[id]/support` | Engagement with recommendations, incoming requests. |

### Student
| Route | Purpose |
| --- | --- |
| `/student/[id]` | Home. Learning health across every course they are in, one way back into the work, and their course list. |
| `/student/[id]/profile` | The student's own profile, with a completeness indicator. |
| `/student/[id]/lecture` | Lecture list grouped by module, with the student's own progress. |
| `/student/[id]/lecture/[lid]` | **The interactive lecture.** |
| `/student/[id]/notes` | All notes, filters, study tools, knowledge gaps. |
| `/student/[id]/readiness` | Status, strengths, gaps, and the full reasoning. |
| `/student/[id]/assessments` | Practice and graded work. |
| `/student/[id]/assessments/[aid]` | Answer a practice set or assessment. |
| `/student/[id]/support` | The support plan; accept, complete, decline, request help. |
| `/student/[id]/resources` | Published materials by module, objectives, key terms. |

### Where the dashboards stop

Both dashboards answer one question — *what is the state of learning* — and then
get out of the way. The per-course worklists (who to follow up, which questions are
unanswered, what is scheduled) live on `/professor/courses/[id]`, because they are
course-scoped questions; a professor teaching eight courses cannot act on a merged
list of all of them. The wheels on the dashboard are the route in: each legend row
is a link into the filtered list behind it.

All data-bearing routes are `force-dynamic`. They read live SQLite on every
request; prerendering them would bake build-time IDs into the HTML. (This was
caught by the smoke test rather than by inspection — the first build shipped a
statically prerendered dashboard whose course links 404'd.)

## Persistence and hosting

One driver, two shapes, chosen by environment in `lib/db/client.ts`:

- **A local file.** Development, and any host with a durable disk. Nothing special.
- **An embedded Turso replica.** Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` and
  libSQL keeps a local mirror on disk, answers reads from it at SQLite speed, and
  forwards writes to a hosted primary.

The replica is what makes serverless hosting possible without re-architecting the
data layer. Every repository function is synchronous and the readiness gather runs
nine queries per student — roughly 1,200 for a 134-student dashboard. Against a
network database that is seconds per page load; against a local replica it is the
~130ms it has always been. Writes are rare by comparison and can afford the round
trip.

The trade is consistency: an instance sees its own writes immediately and other
instances' writes within `TURSO_SYNC_INTERVAL_MS` (default 2s). Worth knowing before
building anything that assumes otherwise.

`lib/db/driver.ts` is the seam. It exists for two differences between `libsql` and
the `better-sqlite3` it replaced:

1. **Types.** libsql's `prepare` takes one type parameter, not two, so rows come back
   as `unknown`. The adapter restores the two-parameter shape and casts once, rather
   than weakening ~280 correct call sites.
2. **Nested transactions.** better-sqlite3 promotes an inner `transaction()` to a
   SAVEPOINT; libsql issues a bare `BEGIN`, which throws — and whose error path
   `ROLLBACK`s the *outer* transaction, discarding work the caller believed was
   committed. The adapter reinstates savepoint promotion. The seed nests two levels
   deep, and `npm run verify` guards the dangerous case: an inner transaction that
   fails.

Two operational constraints follow from the replica being a real file on disk:

- **One replica per process.** Two processes pointed at the same replica file corrupt
  each other's view of it through the native layer, and the failure mode is the
  server exiting with no JavaScript stack. The path carries the process id.
- **A replica belongs to one primary.** It records which, and how far it has replayed,
  in `<path>-info`. Repoint at a different database and the new primary rejects it.
  Since a replica is a disposable mirror, the app discards and re-pulls it rather than
  failing every request with an opaque error.

Deployment specifics — creating the database, exporting it in a form Turso will
actually import, the environment variables — are in `README.md`.

## The interactive lecture

The centrepiece, and the reason the data model looks the way it does. The design
target from the brief: *students should not have to explain which part of the
lecture they are referring to.*

A lecture is a list of `lecture_segments`, each with a heading, body, start
timestamp and transcript excerpt. Every student control on the page is a form
scoped to a segment, and every one of them carries the same hidden context:

```
courseId · lectureId · segmentId · segmentHeading · atSeconds
         · transcriptExcerpt · objectiveId
```

So a note, a marker, a question or a bookmark arrives already knowing where it
came from and which learning objective it bears on. That last field is what turns
a "this is confusing" click into readiness evidence rather than an orphan event.

Controls on each segment: four markers (clear / confusing / important / possible
exam content, each toggling and the first pair mutually exclusive), bookmark,
timestamped note composer (ten note kinds), question composer (five question
kinds including *ask for a simpler explanation* and *connect to an earlier
lecture*), plus whichever interactive moments the professor anchored there.

Alongside: video area, professor's student-facing notes, transcript, class
questions with upvoting, and a sidebar holding the timeline (annotated with the
student's own markers), objectives, key terms with perspective notes, scripture,
supplemental resources and the student's own bookmarks.

The page works with JavaScript disabled — every control is a real form posting to
a server action. The only client components are the composers that need pending
state and the live-console poller.

## Interactive moments

Fifteen types in one table, discriminated by `type`, with options in a child
table (`interaction_options`) rather than a JSON blob. They fall into three
behavioural groups declared in `vocabulary.ts`:

- **Informational** (definition, exam emphasis, historical context, theological
  perspective, recommended reading, important concept, scripture reference) —
  rendered as marginalia; no response expected.
- **Written** (reflection, application, discussion prompt, pause and reflect) —
  free text, stored for a human, never scored.
- **Scored** (comprehension question) — the only type that produces accuracy
  evidence. Plus polls (recorded, no correct answer) and confidence ratings
  (recorded as confidence evidence).

Grouping this in the vocabulary module rather than in component conditionals means
adding a type is a one-line change plus a label.

## Live lecture mode

Deliberately modest, and labelled as such on the screen itself.

The professor can start and end the session, publish or hold back individual
interactive moments, share the current topic, answer questions, mark them
addressed, and watch comprehension tallies and confusion indicators.

What it does **not** do: stream video (it links out to whatever provider the
institution already uses) and push updates (there is no websocket). The console
polls its own route every 15 seconds via `router.refresh()`, with a visible
pause control and a plain statement that this is polling. "Active students" means
*students with recorded activity in the last 30 minutes* — there is no presence
channel, and the label says so. Replacing `LivePoller` with a subscription is the
whole change when real-time infrastructure exists.

## Content provider abstraction

`components/lecture/video-area.tsx` exports `resolveEmbed(url, title)`, which
returns one of four shapes: `iframe` (YouTube and Vimeo, resolved to privacy-mode
embed URLs), `link` (any other host), `placeholder` (a URL that is recognisably a
demo placeholder, or malformed), or `none`. Adding a provider is one branch.

The `placeholder` case matters: the seeded lecture points at
`DEMO_PLACEHOLDER` URLs, and the page says *"No recording is available for this
lecture"* rather than rendering a dead player.

## File storage

There is none, and the application never implies otherwise. Materials record
`file_name`, `file_size` and `storage_adapter = 'local-metadata-only'`. Every
surface that shows a filename adds *"metadata only, no file is stored"*, and the
student resources page says *"there is nothing to download — ask your professor
for the file."*

## AI layer

`lib/ai/types.ts` defines `AIProvider` with nine methods. Every result is wrapped
in `AIResult<T>` carrying `Provenance`: provider id, human label, **`isSimulated`**,
model, timestamp, and a `sourceNote` describing what the output was derived from.

`PrototypeAIProvider` calls no model. It restructures content the professor
already entered — segment headings, concept definitions, objectives, transcript
sentences — into the shapes the UI expects, and reports `isSimulated: true`. The
syllabus extractor is genuine rule-based parsing of common headings, and says so.

`getAIProvider()` reads `AI_PROVIDER`. An unrecognised value logs a warning and
falls back to the deterministic provider rather than failing at request time or
quietly pretending. `AIProvenance` renders the provenance on screen wherever
output appears, and `NeedsReviewFrame` visibly marks course-wide output as a
draft until a professor approves it. Results persist to `ai_artifacts` with their
provenance intact.

Details in `ai-integration-plan.md`.

## Role context

`lib/role/role-context.ts` is the only place the application answers "who is
acting?".

- `requireProfessor()` returns the seeded professor with `unauthenticated: true`.
- `currentStudent()` resolves a session cookie to a student.
- `currentStudentInCourse(courseId)` additionally asserts course membership.

Every student server action derives the course from the **session**, never from
the submitted form, so a forged `courseId` field writes nothing. `PlannedRole`
names the administrator and teaching-assistant roles the architecture anticipates
without pretending they exist.

## Privacy enforcement

The professor-visible surface is enforced in the repository layer, not in the UI.
`listSharedNotes()` hard-codes `shared_with_professor = 1` and is the only
function any professor-facing screen may use for notes. `listNotes()` requires a
`studentId`. Student-facing material queries pass
`{ studentVisibleOnly: true }`, filtering to `visibility = 'students'`.

The verification suite asserts that professor-visible notes are a strict, non-empty
subset of a student's total notes.

## Design system

Built from the brand board in `public/brand/New_Style.png`. Five colours, one
typeface, one button shape.

| Role | Hex | Where it goes |
| --- | --- | --- |
| Primary ink | `#0B0D16` | Text, and the primary CTA surface |
| Surface | `#FFFFFF` | Cards |
| Brand blue | `#2F5BFF` | Accent — a handful of times per screen |
| Slate | `#6C7A95` | Secondary text, hairline borders |
| Light blue | `#A7C1FF` | Tonal fills, gradients, progress tracks |

Tokens are declared once in `@theme` in `src/app/globals.css`, as ramps built around
those five values: `brand-*`, `ink-*`, `slate-*`, `paper-*` (the cool near-white
canvas), plus the four status ramps. No component hard-codes a hex value, and the
contrast script reads these tokens directly rather than keeping a copy.

**The rule that keeps it calm.** The application is white, pale blue and near-black.
Saturated `#2F5BFF` is an accent, not a background — it appears a few times on a
screen and never as the default state of a component. **The primary button is
near-black, not blue.** If every call to action were blue, blue would stop meaning
anything.

**Typography.** Satoshi, self-hosted by `next/font/local` from `public/fonts`. Four
weights (300/400/500/700) and no second family — hierarchy comes from scale and
whitespace rather than from weight or a serif. Headings cap at weight 500; anything
heavier starts to look like an enterprise dashboard. Nothing is fetched from a third
party at runtime, which keeps the "no request leaves the origin" claim in the privacy
notes true.

**Shape.** Radii run 12 / 18 / 24 / 30 / 32px with cards in the 24–32px range;
buttons and navigation are pills. Borders are a blue-grey at 16% alpha rather than a
solid grey — a solid line at this radius looks drawn on, a translucent one looks like
the edge of a material. Shadows are broad and low-opacity, tinted with the ink rather
than pure black.

**Icons.** One family, Lucide, at 1.75 stroke weight. Nav icons are passed as *names*
rather than components, because navigation is defined in server components and
rendered by a client one, and a React component is a function — which cannot cross
that boundary.

### The card hierarchy

Four levels, in `src/components/ui/cards.tsx`, so a screen can say what matters
without every surface shouting:

| Component | Use |
| --- | --- |
| `FeatureCard` | One per screen at most. Gradient, abstract artwork, the next action. |
| `LearningCard` | The standard content card — a course, a module, a topic. |
| `LessonRow` | A compact row in a list. Dense, still comfortable to tap. |
| `AIInsight` | A quiet surface for what the system has noticed. |

Every one is a link when it has somewhere to go, and the whole surface is the target
rather than a small "view" affordance in a corner.

### Predictive intelligence, visually

No robots, no glowing brains, no shower of sparkles. `AIInsight` is one small mark and
a sentence in the product's own voice — "Let's reinforce X", "Your recorded work
suggests…" — and it renders **only when the model has something to say**. A
"Recommended for you" heading above an empty recommendation is exactly the hollow
intelligence the design direction warns against.

It also carries a `provenance` line, because this product distinguishes what a model
produced from what was assembled by rule, and a restyle must not quietly drop that.

### Abstract artwork

`src/components/viz/abstract.tsx` renders four motifs — orbit, cluster, flow, bloom —
as flat SVG with radial gradients that read as lit volumes. They are a few hundred
bytes each, scale to any card, take their colours from the token layer, and never
arrive late or broken. A 3D render would look better in a still; this looks better in
a product that has to load.

All of it is `aria-hidden` and `pointer-events-none`: it carries mood, not
information. It is also smaller and pushed further off-canvas on narrow screens,
because at full size it sat behind the headline — the one thing a decorative backdrop
must never do.

### Charts

Three forms, and a rule about which one applies.

| Form | Component | Job |
| --- | --- | --- |
| Donut + legend | `viz/health-wheel.tsx` | part-to-whole across ≤4 status bands |
| Horizontal bars | `viz/bar-chart.tsx` | compare magnitude across nominal items |
| Ring / bar / headline | `ui/progress.tsx` | one ratio against a limit |

**Every bar in a chart wears one hue.** The bar lists used to colour each row by its
own value — red when high, amber when low — which double-encodes: length already says
how big the number is, so hue spent on the same fact buys nothing and costs the only
free channel a chart has. Objectives and questions are *nominal* (LO2 is not "more"
than LO1), so magnitude is length alone.

**Fills and text are different tokens.** The `400` step is the fill; `500`/`600` are
for text. A chart is a large area of colour and the same green that reads as calm in a
14px label reads as a traffic light at 40px.

**There is no trend chart, deliberately.** Readiness snapshots are written only when a
student's status actually changes, so the table holds roughly one row per student and
no history to plot. The comprehension dashboard says so in words rather than drawing a
line through a single point.

**Status fills were derived, not chosen.** The first pass softened them by eye to sit
with the blue and produced amber and rose at ΔE 10.7 — below the 15 floor at which
neighbouring segments stay distinguishable under *normal* vision, never mind CVD. They
were re-stepped by search for the smallest move that clears every gate. The three
meaning-bearing bands also clear 3:1 on white; the "not enough data" grey sits at
2.40:1 on purpose, because a band meaning *absence* should recede, and it is relieved
by the glyph and label that always travel with it. `npm run check:contrast` records
that exemption explicitly as a `relieved:` row rather than omitting it.

**Every chart has a table twin.** `HBarChart` ships a `<details>` table for anything
with more than one row, so no value is reachable only by hovering.

### The visualisation system

`src/components/viz/health-wheel.tsx` is the one chart component, used for course
health, cohort health and a student's own learning health. It takes segments with a
label, a count, a tone and a link, and renders a ring with a figure in the middle.

The accessibility design is the whole reason it is a component rather than three
charts. **The ring is decoration.** Every segment is also a row in the legend, and
those rows are real links: they take keyboard focus, and focusing one reveals the
same detail panel that hovering an arc reveals. Nothing is reachable by pointer that
is not reachable by keyboard, and nothing is conveyed by arc colour that is not also
written in the legend as a glyph (● ◐ ◆ ○), a label, a count and a share. The `<svg>`
carries `role="img"` and an `aria-label` that states the whole distribution in one
sentence, so a screen reader gets the summary without traversing the legend.

Arcs are painted with the **400-level fill tones**, not the text tones. A chart is a
large area of colour, and the same green that reads as calm in a 14px label reads as a
traffic light at 40px — which made the dashboard look like a different product from
the rest of the system. The legend beside it uses the darker text tones, where
contrast is what matters.

Arc geometry is `stroke-dasharray` and `stroke-dashoffset` on a circle — no charting
library, no runtime dependency, and it renders on the server. Segments with a zero
count are dropped from the ring but kept out of the legend only when they carry no
meaning; "not enough data yet" is always shown when non-zero, because hiding it
would imply a certainty the model does not have.

The aggregation is separate, in `src/lib/domain/health.ts`, and is pure: thresholds
in one place, no database access, no formatting. That is what makes the bands
testable and what stops a chart from quietly inventing its own definition of
"healthy".

### Two constraints the brand colours impose

Neither is obvious, and both were found by measuring rather than by eye.

**Light blue cannot carry text.** `#A7C1FF` is 1.79:1 against white — it fails AA and
even the 3:1 large-text threshold. It fills shapes, tracks and gradients; anything
blue that has to be *read* uses `brand-700` or darker.

**The brand Slate cannot carry body text either.** `#6C7A95` is 4.33:1 on white, just
under the 4.5:1 bar, and worse on the tinted grounds this system uses. So `ink-400`
— the muted-text token — is a darkened version of it, tuned against the *tint*
(`#f1f5ff`) rather than white: passing only on the lightest ground is how a palette
quietly fails on half the screens that use it. The original value stays available as
`slate-500`, where 3:1 is the bar because it draws borders and graphics rather than
words.

### Verified contrast

`npm run check:contrast` checks all 43 pairings the app renders and exits non-zero on
a regression. It **reads the tokens straight out of `globals.css`** rather than
keeping its own copy — the copy drifted the moment the palette was rebranded, and the
script cheerfully reported "all pairings pass" against colours the app no longer used.

| Pairing | Ratio |
| --- | --- |
| body text `ink-900` on `paper-100` | 18.41 |
| muted text `ink-400` on the tint `paper-200` | 4.57 |
| link `brand-700` on white | 7.41 |
| primary CTA: white on `ink-900` | 19.38 |
| brand button: white on `brand-600` | 5.17 |
| on track `track-600` on `track-50` | 7.23 |
| control border `slate-500` on white (needs 3:1) | 4.33 |
| chart fill `track-400` on white (needs 3:1) | 3.10 |

Rows labelled `graphic:` in the script are judged at 3:1 under WCAG 1.4.11 rather than
4.5:1 — borders, focus rings and chart fills, none of which is the only carrier of
meaning.

The status ramps stay unmistakably green / amber / red / grey rather than being pulled
into the blue palette. Four shades of one hue is not a distinction anyone can make at
a glance, and these four bands are the one place colour carries consequence. They were
retuned — cooler, softer, lower chroma — to sit alongside the blue without losing it,
and colour is never the only signal: every surface pairs them with a glyph and a label.

### Brand assets

`public/brand/Logo.png` is the supplied sheet, kept as the source of truth.
`mark-primary.png`, `mark-dark.png` and `mark-tonal.png` are 192px crops of the three
icon variants it defines; `logo-lockup.png` is the mark plus the drawn wordmark.

`<BrandLockup>` pairs the **mark** with the product name as **real text** rather than
using the wordmark image. The type is Satoshi either way, and text scales with the
viewport, wraps sensibly, gets read aloud, and never renders as a broken picture. The
mark carries the identity; the name carries the meaning.

`product.institution.logo` in `src/config/product.ts` holds every path and the alt
text, so swapping the identity means editing one object.

**`unoptimized` is deliberate.** It makes the src a plain `/brand/mark-primary.png`
rather than `/_next/image?url=…&w=…`. Three reasons, and the first is the one that
actually bit: query-string image URLs are a routine casualty of privacy extensions and
ad blockers, so the logo can appear broken in a browser while the server serves it
perfectly. The optimiser also rejects widths outside its configured set, and it wants
`sharp` on the host. For a 33KB square already sized for its slot there is nothing to
optimise, so the machinery is pure downside. The lockup is on every screen — it has to
be the most reliable image in the product, not the cleverest. Smoke assertions hold
the line: the src must be a plain path, and no page may contain an `_next/image`
reference.

## Accessibility

WCAG 2.2 AA was the target. Specifics:

- **Status is never colour alone.** `StatusPill` renders a distinct shape glyph
  (● ◐ ◆ ○), the text label, and the colour. `StatusLegend` explains all four
  bands. `StandingPill` does the same per objective.
- **Skip link** to `#main` on every page; one `<main id="main">` per page.
- **Focus** is a 2px burgundy outline with 2px offset, never removed.
- **Forms**: the `Field` component derives hint and error IDs from the field ID
  and wires `aria-describedby` and `aria-invalid`, so a caller cannot forget.
  Required fields carry a visible marker and a screen-reader-only "(required)".
  Radio groups are `<fieldset>` + `<legend>`.
- **Tables** have captions and `<th scope>`; row headers are the student name or
  objective.
- **Toggles** (markers, bookmarks, upvotes) use `aria-pressed` and append
  screen-reader-only text explaining what pressing again does.
- **QR codes** are `aria-hidden`; the URL and the six-character code are always
  printed as text beside them, and `/join` explains what to do if scanning is not
  an option.
- **Video**: a transcript region is always present; where captions depend on the
  provider, the page says so rather than claiming captions exist.
- **Live regions**: `FormStatus` is `role="status" aria-live="polite"`, so action
  results are announced.
- **Links are visually distinct.** Tailwind's preflight resets `<a>` to
  `color: inherit` with no decoration, which left unstyled links indistinguishable
  from body text — a WCAG 1.4.1 failure that survived until the brand pass. Base
  styles now give links the tertiary blue and an underline; components that
  deliberately opt out (navigation, card rows, the lockup) carry `no-underline`.
- **Responsive**: single column below `lg`, sidebar above; wide tables scroll in
  their own container so the page body never scrolls horizontally.

## Verification

Two suites, both run against real data.

`npm run verify` — 60 assertions over the data layer in a throwaway database:
readiness spread across all four bands, every status explainable, no score without
evidence, questions never penalised, help requests overriding the score,
recommendations only ever pointing at real published rows, the privacy boundary,
and the complete 21-step vertical slice from course creation through to the
student completing an assigned recommendation.

`npm run smoke` — 135 assertions against a running server, checking what each
screen actually renders: every control in the interactive lecture, the four status
bands and their glyphs, the roster filters, the reasoning surfaces, the five
support pathways, and each honesty claim (no FERPA compliance, no streaming, no
real scheduling, no file storage, polling not push, snapshots not interpolation).
