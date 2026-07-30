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
| `/` | Landing. Two doors: professor portal, join a course. |
| `/about` | What the prototype is and, at length, what it is not. |
| `/professor` | Professor entry. Redirects to the dashboard; becomes the sign-in screen later. |
| `/join` | Enter a course code, with an accessible alternative to scanning. |
| `/join/[courseCode]` | Course preview, name + consent, then into the portal. |

### Professor
| Route | Purpose |
| --- | --- |
| `/professor/dashboard` | Who needs attention, what is confusing, what is unanswered, what is coming. |
| `/professor/courses` | All courses with access codes and counts. |
| `/professor/courses/new` | Course creation. Issues code, link, QR, access card. |
| `/professor/courses/[id]` | Overview: access panel, setup checklist, modules, objectives. |
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
| `/student/[id]` | Course home with a single recommended next action. |
| `/student/[id]/lecture` | Lecture list grouped by module, with the student's own progress. |
| `/student/[id]/lecture/[lid]` | **The interactive lecture.** |
| `/student/[id]/notes` | All notes, filters, study tools, knowledge gaps. |
| `/student/[id]/readiness` | Status, strengths, gaps, and the full reasoning. |
| `/student/[id]/assessments` | Practice and graded work. |
| `/student/[id]/assessments/[aid]` | Answer a practice set or assessment. |
| `/student/[id]/support` | The support plan; accept, complete, decline, request help. |
| `/student/[id]/resources` | Published materials by module, objectives, key terms. |

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

Tokens in `@theme`, in `src/app/globals.css`. Deep burgundy, warm neutrals,
cream, charcoal, restrained gold. Four status ramps — track (green), attention
(amber), concern (red), unknown (slate) — each with a 50/100/200/500/600 scale so
text and background can be paired at AA.

Load-bearing contrast pairings, all against their intended background:

| Foreground | Background | Ratio |
| --- | --- | --- |
| `ink-800` #1c1a18 | `cream-100` #fbf7f0 | 15.4:1 |
| `ink-500` #55504a | `cream-100` | 7.3:1 |
| `cream-50` #fdfbf7 | `burgundy-600` #6b1f2e | 10.5:1 |
| `track-600` #245139 | `track-50` #eef5f0 | 7.4:1 |
| `attention-600` #6d4a0a | `attention-50` #fbf3e3 | 7.4:1 |
| `concern-600` #822a1f | `concern-50` #fbeeec | 7.8:1 |
| `unknown-600` #414a52 | `unknown-50` #f1f2f3 | 8.2:1 |

The amber ramp is why `attention-500` is #8a5f10 rather than a conventional
yellow: a yellow that reads as "warning" fails AA on a cream background, and the
status must be readable as text, not just visible as a colour.

`prefers-reduced-motion: reduce` collapses every transition and animation
globally.

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
