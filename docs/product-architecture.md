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

Built from the Fuller Seminary style guide supplied in `public/brand/`. Six colours,
two typefaces, one button.

| Role | Hex |
| --- | --- |
| Primary | `#042B32` deep teal |
| Secondary | `#00ADC7` cyan |
| Tan | `#D8D2C4` |
| Tertiary | `#005979` — the Primary CTA colour |
| Black | `#0C1821` |
| White | `#ffffff` |

Tokens are declared once in `@theme` in `src/app/globals.css`, as ramps built around
those six values: `brand-*` (teal), `cta-*` (tertiary blue), `accent-*` (cyan),
`paper-*` and `tan-*` (neutrals), `ink-*` (text), plus the four status ramps. No
component hard-codes a hex value.

**Typography.** Noto Serif for headings, Noto Sans for body — loaded by `next/font`,
which downloads them at build time and serves them from our own origin. Sixteen
`.woff2` files ship with the build and no request goes to Google at runtime, which
keeps the "no request leaves the origin" claim in the privacy notes true.

**Buttons.** The guide gives one button: tertiary blue, white label, square corners.
That is `variant="primary"`, and `rounded-none` is deliberate. Form controls match.
Secondary and ghost variants are derived, not specified, so they stay quiet.

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

**The secondary cyan cannot carry text.** `#00ADC7` is 2.69:1 against white — it fails
AA for body text and even the 3:1 large-text threshold. So cyan is used for fills,
borders and graphics only: the active navigation underline, meter fills, accent rules.
Anything cyan that has to be *read* uses `accent-600` (#006b7d) or `accent-700`
(#00505e).

**The brand tan cannot outline a control.** `#D8D2C4` is 1.51:1 against white, and
WCAG 1.4.11 wants 3:1 for the boundary of an interactive component. Form controls
therefore use `tan-400` (#8f877a, 3.55:1) while decorative dividers keep the lighter
tans, which have no contrast requirement.

### Verified contrast

`npm run check:contrast` checks all thirty pairings the app renders and exits
non-zero on a regression. Values in the script mirror the `@theme` block — change one,
change both.

| Pairing | Ratio |
| --- | --- |
| body text `ink-800` on `paper-100` | 16.36 |
| muted text `ink-500` on `paper-100` | 7.18 |
| subtle text `ink-400` on `paper-100` | 5.04 |
| link `cta-600` on `paper-100` | 7.07 |
| primary CTA: white on `cta-600` | 7.76 |
| accent text `accent-700` on `accent-50` | 8.31 |
| on track `track-600` on `track-50` | 8.22 |
| needs review `attention-600` on `attention-50` | 7.48 |
| support recommended `concern-600` on `concern-50` | 8.22 |
| not enough data `unknown-600` on `unknown-50` | 8.24 |
| prototype banner `paper-200` on `ink-800` | 15.24 |
| control border `tan-400` on white (needs 3:1) | 3.55 |

The status ramps stay unmistakably green / amber / red / grey rather than being pulled
into the teal palette, because their job is to be distinguishable at a glance. They
were retuned to sit alongside it without losing that.

### Brand assets

`public/brand/Fuller_Logo.png` (1456×184) is the supplied lockup, kept as the source
of truth. `public/brand/fuller-logo.png` is a 640×81 downscale of it — the size
actually served, since the mark is displayed at most 34px tall, which puts 640px well
past 2× on a retina screen at half the bytes.

`<BrandLockup>` renders it with an explicit height and a width derived from the ratio,
so the space is reserved before the image loads and there is no layout shift.
`product.institution.logo` in `src/config/product.ts` holds both paths, the
dimensions and the alt text; swapping the asset means editing that one object.

Alt text is "Fuller Seminary" because that is what the wordmark reads — the
surrounding link resolves to "Fuller Seminary Learning Companion".

**`unoptimized` is deliberate.** It makes the src a plain `/brand/fuller-logo.png`
rather than `/_next/image?url=…&w=…`. Three reasons, and the first is the one that
actually bit: query-string image URLs are a routine casualty of privacy extensions and
ad blockers, so the logo can appear broken in a browser while the server is serving it
perfectly. The optimiser also rejects widths outside its configured set, and it wants
`sharp` present on the host. For a 21KB asset already sized for its slot there is
nothing left to optimise, so all that machinery is downside. The lockup is on every
screen — it needs to be the most reliable image in the app, not the cleverest. Two
smoke assertions hold the line: the src must be a plain path, and no page may contain
an `_next/image` reference.

`public/brand/Style Guide.png` is kept alongside as the reference.

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
