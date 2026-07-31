# Prototype data model

SQLite. The full DDL is in `src/lib/db/schema.ts`, kept as a TypeScript string so
it is bundled with the server build and needs no filesystem path resolution.

## Conventions

- **Stable prefixed text IDs**, not autoincrement: `crs_`, `lec_`, `seg_`, `stu_`,
  `obj_`, `cpt_`, `int_`, `asm_`, `rec_`, and so on (`src/lib/db/ids.ts`). The
  prefix makes an ID self-describing in a URL or a log, and makes it obvious when
  the wrong kind of ID has been threaded somewhere.
- **Course access codes** use a 32-character alphabet with `I`, `O`, `0` and `1`
  removed, because these get read aloud in a lecture theatre and written on
  whiteboards. Six characters, case-insensitive on lookup.
- **Timestamps** are ISO-8601 UTC strings.
- **Booleans** are `0`/`1` integers, typed as `number` in the row types and
  converted at the edges rather than pretended away.
- **`is_demo = 1`** marks seeded demonstration rows so the interface can label
  them.
- **Foreign keys are enforced** (`PRAGMA foreign_keys = ON`), with WAL journalling
  and a 5-second busy timeout.

### The JSON rule

The brief asked that core relationships not be buried in unstructured JSON. They
are not. Every relationship is a real column or a real join table:

- Multiple-choice options → `interaction_options`, `assessment_question_options`
- Material tagging → `material_objectives`, `material_concepts`
- Lecture tagging → `lecture_objectives`, `lecture_concepts`, `lecture_resources`
- Assessment scope → `assessment_objectives`, `assessment_lectures`,
  `assessment_concepts`
- Question upvotes → `question_votes`

The only JSON in the schema is `ai_artifacts.content`, which holds a generated
payload whose shape varies by artifact kind. That is genuinely free-form output,
not a relationship, and it is parsed through typed helpers.

## Entities

### People and access

| Table | Notes |
| --- | --- |
| `professors` | Seeded. One row in the prototype. Carries profile columns — title, department, office, office hours, credentials, teaching philosophy, calendar availability, photo URL, links — all nullable. |
| `students` | Created on join. No credentials. Carries profile columns — preferred and legal name, program, degree, year, advisor, church, ministry context, timezone, learning preferences, accessibility needs — all nullable. |
| `courses` | Title, code, description, term, meeting details, format, theme, enrolment, dates. |
| `course_codes` | Separate from `courses` so a code can be rotated or retired without losing the trail of how students joined. One active code at a time. |
| `course_entries` | Enrolment: course × student, unique, with `source` (`qr` / `link` / `code`) and `consent_at`. |
| `student_sessions` | Cookie-backed prototype sessions. |

### Course structure

| Table | Notes |
| --- | --- |
| `modules` | Ordered by `position`, with an optional week label. |
| `learning_objectives` | `code` (LO1…), text, optional module. **Readiness is measured against these.** |
| `concepts` | Named theological terms / exam topics. Carries `definition` and `perspective` — the latter is the note shown when traditions genuinely differ. One table, because in practice a professor reuses the same named concept as a term, a topic and an exam emphasis. |

### Syllabus

| Table | Notes |
| --- | --- |
| `syllabi` | Source text or filename, `extraction_state` (`not_run` / `extracted` / `reviewed` / `published`), the provider label used, review and publish timestamps. |
| `syllabus_items` | **One row per extracted fact**, with `kind`, `ai_generated` and `approved`. Row-level approval is the whole point: publishing only ever promotes `approved = 1` rows into objectives, modules, assessments and materials. |

### Materials and lectures

| Table | Notes |
| --- | --- |
| `course_materials` | 18 content types. `visibility` is `students` / `professor_only` / `draft`. `storage_adapter` records that only metadata was stored. |
| `lectures` | Delivery mode, status, provider, video and live URLs, teaching notes, student notes, transcript, live timestamps, current topic. |
| `lecture_segments` | The unit everything anchors to: position, start/end seconds, heading, body, transcript excerpt. |
| `slides` | Ordered titles and notes. |
| `scripture_references` | Course- and lecture-scoped, optionally segment-scoped. |

### Interactive moments

| Table | Notes |
| --- | --- |
| `interactions` | 15 types. Anchored by any of `at_seconds`, `segment_id`, `slide_id`, `concept_id`, `objective_id`. `published` gates student visibility, which is what the live console toggles. |
| `interaction_options` | Ordered options with `is_correct`. |
| `interaction_responses` | Unique on (interaction, student) — answers are revisable, and the latest answer counts. Holds `option_id`, `text_response`, `confidence`, `is_correct`. |

### Student activity

| Table | Notes |
| --- | --- |
| `student_notes` | Ten kinds. Carries the full anchor set plus `shared_with_professor`, which defaults to 0. |
| `bookmarks` | Timestamp + label + transcript excerpt. |
| `comprehension_markers` | `clear` / `confusing` / `important` / `exam_likely`, with segment, concept, objective and timestamp. Toggling semantics live in the repository: re-marking clears, and clear/confusing are mutually exclusive per segment. |
| `confidence_responses` | 1–5, scoped to objective or concept, with a context string. |
| `questions` | Five kinds, with the anchor set, `status`, and `anonymous`. |
| `question_votes` | Composite primary key, so a student can upvote once. |
| `professor_answers` | Answers, which flip the question status. |
| `activity_events` | The append-only stream the dashboards and "last activity" columns read. |

### Assessments

| Table | Notes |
| --- | --- |
| `assessments` | Nine types. `is_practice` separates review sets — whose results feed readiness without grade weight — from graded work. |
| `assessment_questions` | Five question types, tied to an objective and a concept. |
| `assessment_question_options` | Ordered, with `is_correct`. |
| `assessment_responses` | Unique on (question, student). **`is_correct` is only ever set for multiple-choice and true/false.** For short answers it stays NULL, permanently, so no query can accidentally treat an unmarked essay as wrong. |

### Readiness

| Table | Notes |
| --- | --- |
| `readiness_snapshots` | Point-in-time status, score, confidence and evidence count. Written **only when the status or score actually moves**, so the trend view is drawn from real change rather than from page views. |
| `status_overrides` | A professor's manual status, with a **required** `reason`, who set it, and `cleared_at`. Never destructive: clearing sets `cleared_at`, so the history survives. |

Note what is *not* a table: there is no `readiness_scores` row that the app reads
as truth. Readiness is computed on demand from the underlying evidence, so it can
never drift out of date relative to the activity it describes. Snapshots are a
record of history, not a cache.

### Support

| Table | Notes |
| --- | --- |
| `support_recommendations` | Pathway, title, rationale, next step, priority, source (`system` / `professor`), status, student response, professor response, completion. Optional links to objective, concept, lecture and material — which is how a recommendation points at something real. |
| `support_requests` | Kind, topics, preferred time, message, `prep_summary`, status. Internal records only; nothing is sent anywhere. |
| `support_actions` | Append-only audit trail: who did what to which recommendation, when. |
| `professor_notes` | Private to the professor, with `follow_up_status`. |

### AI

| Table | Notes |
| --- | --- |
| `ai_artifacts` | Kind, provider id and label, **`is_simulated`**, title, JSON content, `source_note`, reviewer, `approved`. Provenance is stored, not reconstructed, so the UI can always label output accurately even after a provider changes. |

## Relationships

- A professor has many courses; a course has one professor.
- A course has many modules, objectives, concepts, materials, lectures,
  assessments and entries.
- A module has many lectures and materials.
- A lecture has many segments, slides, scripture references, concepts, objectives
  and interactions.
- A student has many notes, markers, confidence responses, questions, bookmarks
  and responses — all scoped to a course.
- Readiness is computed per student per course, and broken down per objective.
- Support recommendations connect a student to a specific gap **and** to a
  specific published resource.
- Course codes and links connect students to a course.
- Student notes are private unless `shared_with_professor = 1`.

## Indexes

Every foreign key used in a list query is indexed, plus the composite keys the
readiness gather relies on: `(student_id, course_id)` on notes, markers and
confidence; `(course_id, status)` on questions and support requests;
`(course_id, student_id, computed_at)` on snapshots. The heaviest read path is the
readiness gather, which runs nine queries per student.

The faculty dashboard is now the heaviest path, not a single roster: it computes
live readiness for every student in every course the professor teaches. Measured on
the seeded load — 8 courses, 134 enrolments — it completes in about 130ms. That is
acceptable for a prototype and would not be for a department. The fix when it
matters is to read the most recent `readiness_snapshots` row per student rather than
recomputing, which is what the snapshot table exists for.

## Migrations

There are none. `schema.ts` is idempotent `CREATE TABLE IF NOT EXISTS` DDL applied
on every connection, and `SCHEMA_VERSION` is recorded in `schema_meta`. For a
prototype whose reset path is `npm run db:reset`, that is the right trade. A real
deployment needs a migration tool before the first schema change that has to
preserve data — see `product-roadmap.md`.

## Seed data

`src/lib/db/seed.ts`. All fictional, all flagged `is_demo = 1`.

The timeline is anchored to when the seed runs, with fixed relative offsets — the
justification lecture is always 19 days ago, the midterm always 11 days out — so the
shape of the data is deterministic while the dates stay current. A seed pinned to a
literal calendar date reads as months stale within a term, which undercuts the whole
premise of noticing a struggling student early.

Two files. `seed.ts` builds CH504 in full depth — it is the course every screen in
the vertical slice is demonstrated against. `seed-faculty.ts` then adds seven more
courses at lower depth, because a dashboard that aggregates across a faculty load
cannot be judged against a single course: one course makes every chart either 100%
or 0%, which proves nothing about whether the visualisation works.

- **Professor** Dr. Miriam Carter
- **Course** CH504: Theology and the Protestant Reformation, code `CH504R`
- **6 modules** — Late Medieval Context, Martin Luther and Justification, Reformed
  Theology, Radical Reformation, Catholic Reformation, Reformation Legacies
- **8 learning objectives**, **8 concepts** (three carrying perspective notes on
  contested terms), **15 materials** across most content types
- **5 lectures.** Three published, one scheduled live, one draft — so the
  draft-invisibility rule is demonstrable. The Luther lecture is built out fully:
  7 segments, 14 slides, 4 scripture references, 5 concepts, a transcript,
  teaching notes, student notes, and 13 interactive moments.
- **21 interactive moments** in total, spanning nine types
- **3 assessments**: a practice review (8 questions including a deliberately
  unscoreable short answer), a midterm, an essay
- **12 students** with hand-tuned activity producing a genuine spread:

| Band | Students |
| --- | --- |
| On track | Anselm Whitfield, Priya Raghunathan, Tobias Lindqvist |
| Needs review | Noor Haddad, Emmanuel Osei, Rachel Steinberg, Camila Duarte |
| Support recommended | Jonah Whitmore, Grace Nakamura, Malik Abernathy |
| Not enough information yet | Sofia Marchetti, Dae-Hyun Park |

Noor Haddad's profile deliberately reproduces the worked example from the brief —
2 of 5 related questions correct, low confidence reported twice, three related
moments marked confusing.

### The rest of the faculty load

`seed-faculty.ts` adds **7 further courses** — BT501, NT520, LG511, ET530, LG522,
TH515, PM540 — each with modules, four objectives, two lectures with segments and
four comprehension questions. Each course declares a target spread of bands, and the
seed produces answers, confidence ratings and confusion markers that *earn* that
spread rather than writing the band into the database. The readiness model computes
what it computes; if the model changes, these numbers move, which is the point.

Twelve of the students are shared across courses, so a student appears in three to
six of them and the faculty roster shows the same person more than once. Totals:
**8 courses, 134 enrolments** across **4 healthy, 2 needs-review, 2 needs-attention**
courses.

Also seeded: 9 student questions with upvotes and one professor answer, notes both
private and shared, two support requests, two professor notes with open follow-up,
and one professor-assigned recommendation the student has accepted and responded
to — so the full round trip is visible on first load without anyone clicking
anything.
