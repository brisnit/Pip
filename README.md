# Fuller Learning Companion

An interactive teaching, learning, and student-support platform for Fuller
Theological Seminary. **Early prototype.**

Professors publish course materials and lectures with comprehension checks.
Students join through a link or QR code, work inside the lecture, and record what
lands and what does not. The application turns that activity into a readiness
picture — for the student, and for the professor — and recommends a specific
intervention drawn from the professor's own published material.

---

## What this is not

Read this before showing it to anyone.

- **No authentication.** No accounts, no passwords, no SSO. The professor portal is
  open. Students identify themselves by typing a name, which is not verified.
  Anyone with a course link can enter as anyone.
- **Not FERPA compliant.** Do not put real student data into it. See
  [docs/privacy-and-student-data-considerations.md](docs/privacy-and-student-data-considerations.md).
- **No grades.** Readiness statuses are prototype signals. They carry no academic
  weight and are reported nowhere.
- **No file storage.** Materials record filename and size only. Nothing is
  uploaded, and every screen showing a filename says so.
- **No video hosting.** Lectures embed or link to an external provider. Where a URL
  is a placeholder, the player says so instead of rendering a dead frame.
- **No live AI.** Every AI-assisted feature runs through a provider interface with
  a deterministic implementation that calls no model and is labelled as sample
  output wherever it appears.
- **No real notifications or scheduling.** Support requests create internal records.
  No email, no SMS, no calendar.
- **No essay grading.** Short-answer and essay responses are stored verbatim for a
  human to read and are never auto-marked.

All demonstration data is fictional. No real Fuller student names are used. No
official Fuller logo or brand asset is bundled or fetched — the wordmark is a
typographic placeholder.

---

## Running it

Requires Node 20+ (developed on 24.16.0).

```bash
npm install
npm run dev          # http://localhost:3000
```

The database is created and seeded automatically on first request. No setup step.

### Try the whole loop in two minutes

1. Open <http://localhost:3000> and choose **Enter professor portal**.
2. The dashboard shows CH504 with twelve seeded students spread across all four
   readiness bands. **Students** → open **Noor Haddad** to see why she reads as
   *Needs review*, signal by signal.
3. **Assign the whole suggested plan** at the bottom of her detail view.
4. Copy the course code from the course overview — `CH504R` — then open
   <http://localhost:3000/join> in a private window, enter the code, and join as any
   name.
5. Open **Martin Luther and the Doctrine of Justification**. Mark a section
   confusing, take a timestamped note, answer the comprehension checks.
6. Open **Study readiness** to see what that added up to, and **Support plan** to
   see what to do about it.
7. Back in the professor portal, that student is now on the roster with a status.

To enter as a seeded student without retyping a name:

```bash
npm run dev:session -- "Noor Haddad"
```

Prints the course ID and a cookie value to set in your browser.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run verify` | 60 assertions over the data layer and the full vertical slice |
| `npm run smoke` | 135 assertions against a running server |
| `npm run db:reset` | Delete and re-seed the database |
| `npm run dev:session -- "<name>"` | Mint a student session cookie |

`npm run verify` uses a throwaway database (`.data/verify.db`) and leaves your
working data alone. `npm run smoke` needs a server running on port 3111:

```bash
npm run build
PORT=3111 npm run start &
npm run smoke
```

---

## Environment variables

None are required. All have working defaults.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PROTOTYPE_DB_PATH` | `.data/prototype.db` | SQLite file. Relative paths resolve under the working directory. |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Base URL used in student join links and QR codes. **Set this if you demo from another machine** — otherwise the QR code points at your own localhost. |
| `AI_PROVIDER` | `prototype` | AI provider id. Any unrecognised value logs a warning and falls back to the deterministic provider. |

No API keys are read anywhere in the codebase. See `.env.example`.

---

## How it is put together

```
src/
  config/product.ts        product name, institutional framing, prototype notices
  app/                     routes, server components, server actions
  components/              presentation only, no data access
  lib/
    domain/                PURE: readiness model, support model, vocabulary
    repositories/          all SQL, typed rows in and out
    ai/                    provider interface + deterministic implementation
    role/                  PrototypeRoleContext — the only "who is acting" answer
    db/                    schema, connection, seed, ids
```

Two properties are worth knowing about:

**`lib/domain/` is pure.** `readiness.ts` and `support.ts` take explicit inputs and
return explicit results with no database access, no globals and no I/O. That is why
the readiness model can be read in one file and checked, and why the verification
suite can assert on it directly.

**Identity has one home.** Everything the application knows about who is acting
comes from `lib/role/role-context.ts`. Adding real authentication means changing
three functions there and nothing above them.

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4,
better-sqlite3, `qrcode`, Zod.

---

## Two things that were load-bearing in the design

**Readiness is never computed from attendance alone, and asking questions is never
scored against a student.** Participation breadth is 8% of the composite and only
counts alongside signals that reflect understanding. Clarification requests are
recorded, shown to the professor as context, and weighted zero — because a model
that penalises curiosity teaches students to hide confusion. A direct request for
help always outranks the computed score.

**Student notes are private, enforced in SQL.** `listSharedNotes()` hard-codes
`shared_with_professor = 1` and is the only function professor-facing screens may
use for notes. The verification suite asserts that professor-visible notes are a
strict, non-empty subset of a student's total notes, so a regression that widened
that query would fail.

---

## Accessibility

WCAG 2.2 AA was the target. Status indicators never rely on colour: each carries a
distinct shape glyph (● ◐ ◆ ○), a text label, and an explanation. Forms wire
`aria-describedby` and `aria-invalid` through a `Field` component so a caller cannot
forget. Tables have captions and scoped headers. Toggles use `aria-pressed` and
announce what pressing again does. QR codes are `aria-hidden` with the URL and code
always printed as text. `prefers-reduced-motion` collapses all animation.

It has not been tested with real assistive technology or real users. That is listed
as a Phase 7 item, not a completed one.

---

## Documentation

| Document | Contents |
| --- | --- |
| [current-state-audit.md](docs/current-state-audit.md) | What the repository contained, every stack decision and why, known gaps |
| [product-architecture.md](docs/product-architecture.md) | Layering, all 29 routes, the interactive lecture, live mode, design tokens, contrast ratios, accessibility |
| [prototype-data-model.md](docs/prototype-data-model.md) | Every table, relationships, conventions, seed contents |
| [student-readiness-model.md](docs/student-readiness-model.md) | Signals, weights, thresholds, missing data, overrides, risks, why it is not a grade |
| [ai-integration-plan.md](docs/ai-integration-plan.md) | Provider interface, what the prototype provider does, rules for a real one, sequencing |
| [future-authentication-plan.md](docs/future-authentication-plan.md) | The one function that changes, what already behaves correctly, migration path |
| [privacy-and-student-data-considerations.md](docs/privacy-and-student-data-considerations.md) | FERPA, minimisation, role-based access, consent, retention, audit, risks of classification |
| [product-roadmap.md](docs/product-roadmap.md) | What is built, what is next, and what should not be built |

---

## Product naming

The product name, institutional framing, prototype notices and support-contact
names all live in `src/config/product.ts` and can be changed in one place.
