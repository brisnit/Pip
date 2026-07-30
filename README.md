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

All demonstration data is fictional and no real Fuller student names are used.
Branding follows the supplied Fuller Seminary style guide — colours, the logo, and
Noto Serif / Noto Sans. The assets live in `public/brand/`, the logo is served from
this app's own origin, and the fonts are self-hosted at build time, so no request
goes to a third party at runtime.

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
4. Open <http://localhost:3000/join> in a private window. The seeded course and its
   code (`CH504R`) are listed there under **Demonstration course** — click **Join
   CH504** and enter any name. (A real course code would come from a professor in
   class; it is listed here only because this course is demonstration data.)
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
| `npm run smoke` | 143 assertions against a running server |
| `npm run check:contrast` | Verify every colour pairing clears WCAG AA |
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

## Troubleshooting

### A page errors, and the message says it is "omitted in production builds"

That wording means you are on `npm run start`. Check these in order.

**1. Was the build rebuilt or deleted while the server was running?** This is the
most common cause and the least obvious. `next start` serves whatever `next build`
last produced, and it reads each route's chunks from `.next` on first request — so a
rebuild underneath a live server breaks only the pages you have not visited yet.
The landing page keeps working; clicking through to a new route 500s. Stop the
server, then:

```bash
npm run build && npm run start
```

`npm run start` now runs a pre-flight check that refuses to start with a missing or
incomplete build, and warns when the build is older than your source.

**2. Does the database hold seeded data?**

```bash
npm run db:reset
```

The app recovers from this by itself — `getActiveProfessor()` re-seeds and retries
before giving up — so you should only see it if re-seeding also failed.

**3. Is the project in a synced folder?** See below.

The full stack trace is always in the terminal running the server. Under
`npm run dev` the message is also shown on the error page, because Next only redacts
it in production.

### The seed race that used to cause this

Worth recording. `ensureSeeded()` checked whether the database was empty *outside*
the seed transaction, so when several processes opened a cold database at once —
`next build` collects page data across nine workers — they all saw zero professors,
all ran the seed, and every process but the first died on
`UNIQUE constraint failed: course_codes.code`. The check now runs inside a
`BEGIN IMMEDIATE` transaction, so the losers wait for the lock, re-read a non-zero
count, and no-op. `npm run verify` guards it with nine concurrent workers.

### No course code to enter on "Join a course"

The `/join` page lists the seeded demonstration course and its code under
**Demonstration course**. The code is also on the professor course overview, with a
QR code and a printable access card.

### Do not keep the database in a synced folder

**This is the most likely cause of a confusing server error on macOS.** If the project
lives under `~/Desktop`, `~/Documents`, Dropbox, OneDrive or Google Drive, the sync
client copies `prototype.db` and its write-ahead log while they are open — leaving
truncated duplicates like `prototype 2.db` — and will sometimes replace the live file
outright. A running server then holds a handle to an unlinked inode, and every query
either returns stale data or fails.

The app now defends itself: it compares the open handle's inode against the file on
disk and transparently reopens when they differ, logging
`the prototype database file changed underneath the open handle — reopening`. It also
warns at startup if the database is inside a folder likely to be synced.

Defence is not a fix. Move the database out of the synced tree:

```bash
PROTOTYPE_DB_PATH=/tmp/flc-prototype.db npm run dev
```

Or move the whole project somewhere unsynced, such as `~/code`. `npm run db:reset`
clears any duplicates already left behind.

### After changing the database while a server is running

`npm run db:reset` against a live server is safe — the server detects the replaced
file and reopens. If you see stale data anyway, restart the server.

### The logo shows as a broken image

The logo is served as a plain path (`/brand/fuller-logo.png`), not through Next's
image optimiser, precisely so this cannot happen — optimiser URLs carry a query string
and get blocked by some privacy extensions. If you still see a broken image, it is a
stale page: hard-reload with Cmd-Shift-R.

### QR codes point at localhost

Expected — that is the default base URL. A phone cannot reach your laptop's
`localhost`. Set the address the phone can actually reach:

```bash
NEXT_PUBLIC_APP_URL=http://192.168.0.10:3000 npm run dev
```

---

## Deploying a shareable demo

The prototype stores data in a SQLite file on disk, so it needs a host that runs a
normal long-lived server. Serverless platforms give each request a throwaway
filesystem, and writes would vanish between page loads.

`render.yaml` in the repository root is a Render Blueprint that sets this up.

1. Push to GitHub (already done if you cloned this).
2. Go to <https://dashboard.render.com/blueprints> → **New Blueprint Instance** →
   select this repository. Render reads `render.yaml` and creates the service.
3. Render prompts you for `DEMO_ACCESS_PASSWORD`. Type whatever you want to give
   stakeholders — you choose it, nothing generates it for you. Leaving it blank runs
   the site with no gate at all.
4. Wait for the first build, then open the `*.onrender.com` URL it gives you. Share
   that link and the password together.

After that, every push to `main` redeploys automatically.

### What the free plan means

- **It sleeps after ~15 minutes idle.** The next visit takes 30–60 seconds to wake.
  Warn stakeholders, or open the link yourself a minute beforehand.
- **There is no persistent disk**, so the database is rebuilt on every deploy and
  every wake. The seeded course, the twelve students and all their recorded activity
  regenerate automatically — but anything a stakeholder creates by hand disappears.

To keep hand-created data, switch to a paid instance and attach a disk. `render.yaml`
carries the exact lines, commented out.

### The access gate

Setting `DEMO_ACCESS_PASSWORD` puts the whole site behind one shared password:
any request without a valid cookie is redirected to `/unlock`.

You choose the password when Render creates the service, and can change it any time
from the service's **Environment** tab. Changing it signs everyone out, because the
cookie is derived from it.

It is **not authentication** — one password, no identity, no roles, no audit trail.
It exists because the professor portal has no login and shows student-shaped records,
so a discoverable URL is a bad idea. The unlock page says as much to whoever opens it.
Leave the variable unset locally and the gate disappears entirely.

### Getting the join links right

Student join links and QR codes need to know the site's public address. On Render this
is automatic — the app falls back to `RENDER_EXTERNAL_URL` at runtime. Anywhere else,
set `APP_URL`.

Use `APP_URL`, not `NEXT_PUBLIC_APP_URL`: `NEXT_PUBLIC_*` variables are inlined during
the build, so they cannot reflect a hostname that only exists once the service does.

### Before showing anyone

Nothing here changes what this prototype is. It has no authentication, it is not FERPA
compliant, and every record in it is fictional. Do not put real student data into a
deployed copy. See
[docs/privacy-and-student-data-considerations.md](docs/privacy-and-student-data-considerations.md).

---

## Environment variables

None are required. All have working defaults.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PROTOTYPE_DB_PATH` | `.data/prototype.db` | SQLite file. Relative paths resolve under the working directory. |
| `APP_URL` | unset | Public base URL for join links and QR codes, read at runtime. Falls back to `RENDER_EXTERNAL_URL`, then `NEXT_PUBLIC_APP_URL`, then localhost. Prefer this for anything deployed. |
| `DEMO_ACCESS_PASSWORD` | unset | When set, gates the whole site behind one shared password. Unset disables the gate. Not authentication — see above. |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Legacy equivalent of `APP_URL`, inlined at build time. |
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

## Brand

Colours, typography and the logo follow the Fuller Seminary style guide in
`public/brand/`. Deep teal `#042B32`, cyan `#00ADC7`, tan `#D8D2C4`, tertiary blue
`#005979` for calls to action, black `#0C1821`. Noto Serif for headings and Noto Sans
for body, self-hosted at build time by `next/font`.

Two brand colours needed care, found by measuring rather than by eye: the cyan is
2.69:1 on white so it can never carry text (it is used for fills, borders and the
active navigation underline), and the tan is 1.51:1 so it cannot outline a form
control. `npm run check:contrast` verifies all thirty pairings the app renders and
fails on a regression. Details in
[docs/product-architecture.md](docs/product-architecture.md) → Design system.

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
