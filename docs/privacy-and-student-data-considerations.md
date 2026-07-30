# Privacy and student-data considerations

## This prototype is not FERPA compliant

Stated first because everything else is downstream of it.

The Fuller Learning Companion prototype **must not hold real student records**. It
has no authentication, no access control, no audit logging, no retention policy, no
encryption at rest, and no institutional agreement. Production use would require
legal, security, operational and institutional review, and substantial engineering
beyond what exists here.

Nothing in this document should be read as a compliance claim. It is a list of what
has been thought about, what has been built, and what has not.

## What the prototype stores

| Data | Source | Where |
| --- | --- | --- |
| Student name | Typed at join | `students.name` |
| Email (optional) | Typed at join | `students.email` |
| Student ID (optional) | Typed at join | `students.student_id_number` |
| Consent timestamp | Join checkbox | `course_entries.consent_at` |
| Coursework activity | Notes, markers, questions, answers, confidence, bookmarks | Various |
| Readiness snapshots | Computed | `readiness_snapshots` |
| Support requests and responses | Student-initiated | `support_requests`, `support_recommendations` |
| Professor notes about students | Professor-authored | `professor_notes` |

Under FERPA this would be an education record. In this prototype it sits in an
unencrypted SQLite file at `.data/prototype.db` with no access control whatsoever.

The join screen tells students this before they type anything: *"Anyone with this
course link can enter, and anyone can enter any name — including yours. Nothing here
is verified. Do not put a real student ID or anything sensitive into it."*

## FERPA considerations for a production system

**Education records.** Coursework activity, comprehension data and readiness
statuses would all qualify. Students have rights of inspection and review,
amendment, and control over disclosure.

**Legitimate educational interest.** Access must be limited to those with such an
interest. A professor teaching the course qualifies for their own students. A
professor browsing another section's roster does not. Today there is no such
check — `/professor/courses/[courseId]` verifies that a course exists, not that the
viewer teaches it.

**Directory information.** Name and email may be directory information depending on
the institution's designation and any student opt-outs. Coursework activity is not.

**Third-party disclosure.** Any AI provider processing student activity is a
disclosure. It requires a data-processing agreement, a school-official
determination or explicit consent, and clarity on retention and model training.
See `ai-integration-plan.md`.

**Right of inspection.** A student must be able to see what is held about them.
Partly satisfied by design — the readiness page shows every signal used and the
reasoning drawn from it — but there is no export, and professor notes about a
student are not currently visible to them, which needs a policy decision rather
than a technical one.

**Amendment.** A student who believes a record is inaccurate can challenge it. The
professor override with a required explanation is the beginning of this, but there
is no student-initiated correction path.

## Data minimisation

What the prototype does:

- Email and student ID are optional, and the form says so.
- No date of birth, address, phone number, photograph or demographic field exists
  anywhere in the schema.
- No behavioural telemetry: no page-view tracking, no dwell time, no scroll depth,
  no click stream. Only deliberate student actions are recorded.
- No third-party analytics, no external fonts, no CDN assets, no remote images. No
  request leaves the origin.
- QR codes are generated server-side, so no third-party QR service ever sees a
  course URL.

What a production system should additionally do:

- Drop the student ID field unless a specific workflow needs it.
- Set explicit retention on `activity_events`, which grows without bound.
- Decide whether transcript excerpts stored alongside notes and markers are needed
  after the term ends.
- Aggregate old readiness snapshots rather than keeping per-student history
  indefinitely.

## Role-based access

Built:

- Student notes are private by default (`shared_with_professor` defaults to 0).
- `listSharedNotes()` hard-codes `shared_with_professor = 1` and is the only
  function professor-facing screens may use for notes. Enforced in SQL, not in the
  UI.
- Student-facing material queries filter to `visibility = 'students'`, so
  professor-only teaching notes cannot reach a student view.
- Draft lectures are excluded from student queries entirely.
- Class-level views (comprehension dashboard, live console, segment confusion)
  aggregate and never name who marked what.
- Every student write derives the acting student and course from the session, not
  from the form.

Not built: any check that a professor teaches the course they are viewing; any TA
or administrator scoping; any policy layer. See
`future-authentication-plan.md`.

### What a professor can and cannot see

**Can see:** aggregated comprehension data, questions a student intentionally
submitted, notes a student explicitly shared, assessment and practice responses,
support requests and responses, recorded activity events, readiness statuses with
their reasoning, and their own notes about the student.

**Cannot see:** private student notes, private bookmarks, or any note the student
has not pressed the share control on.

The student detail screen states this on the page: *"Their private notes are not
shown here and are not retrievable through the professor portal."*

## Private student notes

The single most important boundary in the product, because it is what makes honest
note-taking possible.

- Default private. The share checkbox is unchecked, and its hint says so.
- Sharing is per note, reversible at any time from the notes page.
- Every note carries a visible **Shared** or **private** label wherever it appears.
- The share state is a column, not a UI concern.
- The verification suite asserts that professor-visible notes are a strict,
  non-empty subset of a student's total notes — so a regression that widened the
  query would fail the build.

A student's private notes are also never fed to the AI layer. Support briefs and
readiness narratives are assembled from recorded signals and student-selected
topics only, and the brief itself says so: *"Recorded signals only. This is not a
summary of the student's private notes."*

## Student consent

The prototype asks for it and blocks entry without it. The checkbox reads: *"I
understand this is a prototype, not a secure student-record system"*, with a hint
explaining that name, activity and notes are stored locally and advising against
entering anything sensitive. The timestamp is recorded in
`course_entries.consent_at`.

This is prototype consent, not FERPA consent. A production system needs:

- Notice at the point of collection, in plain language, describing what is
  collected, who can see it, how long it is kept, and how a student can see or
  challenge it.
- A separate, specific decision about any third-party AI processing.
- A route to withdraw consent, and a defined consequence — probably: activity stops
  being recorded, existing records are deleted, and the student uses the course
  material without the feedback loop.
- Consideration of whether consent is meaningful at all when the professor sets the
  terms. Institutional policy may be the more honest basis than individual consent.

## Secure course entry

Today: a six-character code from a 32-character alphabet, roughly 30 bits of
entropy. Not a secret. Codes are read aloud in lecture theatres and printed on
access cards.

Mitigations present: codes can be rotated from the course overview, retiring the
previous code immediately while existing students keep access; the printable access
card warns against posting a code publicly; `course_codes` retains history.

Not present: expiry, rate limiting on join attempts, or any binding between a code
and an identity. After authentication, a code should be a *join* gesture for an
authenticated user, never an identity claim.

## Data retention

None. `npm run db:reset` deletes everything.

A production system needs a written policy covering, at minimum: how long
coursework activity is kept after a course ends; how long readiness snapshots are
kept; how long support requests are kept, given they may reference personal
circumstances; how long professor notes are kept; and what happens on graduation or
withdrawal. `is_demo = 1` on all seeded rows means demonstration data can be purged
in one statement.

## Audit logging

`activity_events` and `support_actions` record what students and professors *did*.
Neither records what anyone *saw*.

A production system needs an append-only access log: who viewed which student's
record, when, from where, and under what role — retained separately, with
integrity protection, and reviewable. Readiness overrides and support decisions
should be individually attributable, which they already are.

## Account deletion

Not implemented. Requirements when it is:

- Delete a student's records on request, including notes, markers, questions,
  responses, snapshots and support records. `ON DELETE CASCADE` is already declared
  throughout, so this is a single delete rather than a hunt.
- Decide what happens to aggregate figures a deleted student contributed to.
  Recomputing changes historical class figures; not recomputing retains their
  contribution. This is a policy question, not a technical one.
- Decide whether professor notes referencing a deleted student survive.
- Retain the access log after deletion, since it exists precisely to be auditable.

## Institutional agreements

Before any real use:

- Registrar and general counsel review of FERPA obligations.
- Information security review, including hosting, encryption at rest and in
  transit, backup handling and incident response.
- Accessibility review against the institution's own standard and Section 508 or
  equivalent.
- A data-processing agreement with any AI or transcription provider.
- Faculty governance review of the readiness model itself — the thresholds encode a
  judgement about what counts as understanding, and that is an academic decision,
  not an engineering one.
- Student government or equivalent consultation, since students are the ones being
  measured.

## AI transparency

Every AI-assisted output carries visible provenance: which provider produced it,
whether a model was actually involved, and what it was derived from. With no
provider configured, the label reads *"Sample output — no AI provider is
configured"* rather than implying intelligence that is not there.

Course-wide generated material stays a draft until a professor approves it, shown
visibly. Generated assessment questions are not auto-importable — a professor must
read and copy them.

Where theological claims are contested, the interface says so rather than
presenting one tradition's account as neutral.

## Human review

Load-bearing, and enforced in more than one place:

- Syllabus extraction is approved row by row; only approved rows publish.
- AI-generated course-wide material requires professor approval.
- Readiness statuses can be overridden by a professor with a required explanation,
  and the computed status is retained alongside so the disagreement stays visible.
- Support recommendations are suggestions until a professor assigns them.
- Short-answer and essay responses store `is_correct` as NULL permanently. The
  application will not produce an automated judgement about theological writing.

## Risks of automated student classification

Taken seriously, because supportive language does not make classification safe.

**Self-fulfilling prophecy.** A student labelled "support recommended" may be
treated as needing support in ways that shape their experience and their
self-assessment. Mitigations present: every status is explained; the wording is
supportive; there is a fourth band for genuinely insufficient data; professors can
override. Mitigation absent: nothing prevents a professor from reading a status as
a verdict.

**Measuring the measurable.** Auto-scored questions carry the most weight because
they are cheapest to collect. That is a structural bias toward recall over
understanding, and it is the model's most serious weakness.

**Uneven self-report.** Willingness to report low confidence varies by background
and by how safe a student feels. Held to 15% of the composite, but not neutral.

**Chilling effect.** A student who believes markers count against them will stop
using them. The product's answer: notes are private, questions are explicitly
zero-weighted, and practice sets are labelled "not graded" so honest answers are
worth giving.

**Aggregate disparity.** Readiness distributions may correlate with protected
characteristics through participation patterns, prior preparation or language.
Nobody has checked, because there is no real data. Any production deployment must
check, and must be prepared to act on what it finds.

**Context invisibility.** The model cannot see illness, caring responsibilities,
financial pressure, bereavement, a disability, or a bad week. It exists to prompt a
conversation in which those things can surface — not to substitute for it.

**Scope creep.** A status computed for formative feedback could be repurposed for
admissions, scholarships, advising or accreditation reporting. It is not valid for
any of those. Policy, not code, has to prevent it.

## The interface commitments

These are enforced in the product, and the smoke test asserts them:

- Nothing describes a student as failing, at risk, or behind.
- Every status shows its reasoning.
- Statuses never rely on colour alone — each carries a distinct shape glyph and a
  text label.
- Where the evidence is thin, the interface says *"not enough information yet"*
  rather than guessing.
- Every screen carries a persistent, non-dismissible prototype notice.
- Screens showing student-shaped records are labelled demonstration functionality.
- The readiness page tells students plainly that this is not a grade, that it can
  be wrong, and that they should say so if it does not match their experience.
