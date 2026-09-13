# Predictive Learning

An adaptive teaching, learning and student-support platform. AI-powered training
that adapts to every learner, builds confidence, and drives real results. **Early prototype.**

Professors publish course materials and lectures with comprehension checks.
Students join through a link or QR code, work inside the lecture, and record what
lands and what does not. The application turns that activity into a readiness
picture — for the student, and for the professor — and recommends a specific
intervention drawn from the professor's own published material.

---

## Presentation mode

`product.prototype.showNotices` in `src/config/product.ts` is **off**. That hides the
persistent banner, the "demo data" badges and the in-page notices about this not
being a real student-record system, so the application presents cleanly to
stakeholders. Set it to `true` to bring every one of them back — nothing was deleted.

It deliberately does **not** hide statements that would otherwise leave a viewer with
a false impression of what the software does: AI output is still labelled as
assembled rather than model-generated, materials still say no file is stored, the
live console still states its refresh interval, and readiness is still described as
not a grade. The `/about` page still sets out the current scope honestly.

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

All demonstration data is fictional and no real student names are used.
Branding follows the supplied brand board — colours, the mark, and Satoshi. The
assets live in `public/brand/`, the mark is served from
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
2. The dashboard opens on two wheels: eight courses by health, and 134 enrolments
   by readiness band. Hover or tab through the legend to see what each band holds.
3. Click **Needs attention** on the course wheel, open a course, and read
   **Students to follow up**. Or go straight to **Courses → CH504 → Students →
   Noor Haddad** to see why they read as *Needs review*, signal by signal.
4. **Assign the whole suggested plan** at the bottom of their detail view.
5. Open <http://localhost:3000/join> in a private window. The seeded course and its
   code (`CH504R`) are listed there under **Demonstration course** — click **Join
   CH504** and enter any name. (A real course code would come from a professor in
   class; it is listed here only because this course is demonstration data.)
6. Open **Martin Luther and the Doctrine of Justification**. Mark a section
   confusing, take a timestamped note, answer the comprehension checks.
7. Open **Study readiness** to see what that added up to, and **Support plan** to
   see what to do about it.
8. Back in the professor portal, that student is now on the roster with a status.

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
| `npm run smoke` | 147 assertions against a running server |
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

### No course code to enter on the student portal

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

The mark is served as a plain path (`/brand/mark-primary.png`), not through Next's
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

Deployed on **Vercel**, with the database on **Turso**.

The prototype stores everything in SQLite and reads it synchronously, in-process —
that is what keeps the professor dashboard fast, since it computes readiness live
across every enrolled student. Serverless platforms give each instance a throwaway
filesystem, so a plain SQLite file cannot be the source of truth there.

Turso solves that without changing how the code is written. The app opens an
**embedded replica**: libSQL keeps a local mirror on disk, answers reads from it at
ordinary SQLite speed, and forwards writes to the primary. Reads never touch the
network, so the dashboard's per-student queries stay cheap; writes are durable and
shared across instances.

### 1. Create the database

Seed locally, export, upload. Seeding writes ~2,200 rows, and doing that over the
network on a first request would exceed any serverless timeout.

```bash
npm run db:reset     # seeds .data/prototype.db
npm run db:export    # writes .data/turso-import.db in a form Turso will accept
```

**`db:export` is not optional.** The prototype runs SQLite in WAL mode, and
`turso db create --from-file` imports *nothing* from a WAL-mode file — it prints
"Uploaded data in 0 seconds", creates the database, and leaves it empty, with no
error. You find out when the first page 500s with `no such table: professors`. The
export step flips the file out of WAL, and reads through the WAL so recent writes are
not lost.

Install the CLI. Without Homebrew:

```bash
curl -sSfL https://get.tur.so/install.sh | bash   # installs to ~/.turso
turso auth login
```

Then create the database and take the credentials:

```bash
turso db create fuller-learning-companion --from-file .data/turso-import.db

turso db show fuller-learning-companion --url          # -> TURSO_DATABASE_URL
turso db tokens create fuller-learning-companion       # -> TURSO_AUTH_TOKEN
```

Check it actually imported before going further — this is the step that catches the
WAL trap:

```bash
echo "SELECT COUNT(*) FROM students;" | turso db shell fuller-learning-companion
# 134
```

Turso creates the database in a region of its choosing (`turso db list` shows it).
**Match `regions` in `vercel.json` to it** — every write crosses that gap. The
current setting is `pdx1` (Portland), which pairs with `aws-us-west-2`.

### 2. Deploy

1. Import the repository at <https://vercel.com/new>. It is a standard Next.js app;
   the defaults are correct and `vercel.json` supplies the rest.
2. Add two environment variables, for **all** environments:

   | Variable | Value |
   | --- | --- |
   | `TURSO_DATABASE_URL` | from `turso db show --url` |
   | `TURSO_AUTH_TOKEN` | from `turso db tokens create` |

3. Deploy, then open the URL.

Every push to `main` redeploys automatically. Join links and QR codes need no
configuration — the app reads Vercel's own hostname at runtime.

### What this setup means

- **Nothing sleeps for 15 minutes the way Render did.** A cold instance does have to
  bootstrap its replica, though, and that cost grows with the database's write
  history rather than its size — under a second on a freshly created database,
  6.7–8.1 seconds on the live one before compaction. See *Keeping cold starts fast*.
- **Data persists.** Anything a stakeholder creates survives deploys, which was not
  true on Render's free plan — there the database was wiped on every wake.
- **Instances converge, they are not instantly consistent.** A replica sees its own
  writes immediately and other instances' writes within `TURSO_SYNC_INTERVAL_MS`
  (default 2s). For a demo this is invisible. It is worth knowing before anyone
  builds a feature that assumes read-your-neighbour's-writes.
- **Re-seeding is a deliberate act**, not something a restart does. Turso imports
  only at creation, so resetting the hosted demo means `turso db destroy` then
  `create --from-file` again — and destroying invalidates the tokens, so issue a new
  one and update it in Vercel.
- **Each process gets its own replica.** Two processes pointed at one replica file
  corrupt each other through the native layer, and the symptom is a server that exits
  with no JavaScript stack. The replica filename carries the process id to prevent
  it. A serverless instance is one process, so this costs nothing there.
- **A replica that cannot sync is rebuilt automatically.** Point a deployment at a
  different database and the old replica's metadata is rejected; rather than failing
  every request with an opaque `InvalidLocalGeneration`, the app discards the mirror
  and pulls a fresh copy.

### Keeping cold starts fast

A new embedded replica bootstraps by replaying the primary's write history, so every
write ever made to the database makes every future cold start slower — and serverless
instances cold-start often: every deploy, after idle, and whenever traffic needs a new
instance. Measured from outside the region against identical data (135 students, 135
snapshots, 8 courses):

| database | first sync, three runs |
| --- | --- |
| live, as it was | 6.7 s · 7.0 s · 8.1 s |
| the same data, created fresh from an export | 0.7 s · 0.4 s · 0.7 s |

`turso db inspect <name>` shows **Embedded syncs**, the total replicas have
downloaded. When that is far larger than the database itself — it was 113 MB against
1.2 MB — cold starts are paying for history. Compact:

```bash
export TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=…   # the database in use now
npm run db:pull                                   # read-only: live data → .data/pulled.db
PROTOTYPE_DB_PATH=.data/pulled.db npm run db:export

turso db create fuller-learning-companion-2 --from-file .data/turso-import.db
turso db show fuller-learning-companion-2 --url
turso db tokens create fuller-learning-companion-2
```

Point `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel at the new database and
redeploy; destroy the old one only once the new one is serving. Anything written to
the old database between the pull and the switch is not carried across, so do it when
nobody is mid-session.

### Rolling back to the previous database

Production was compacted onto `pip-production` on 2026-09-13. The database it replaced,
`fuller-learning-companion`, is kept intact as the rollback. To return to it:

```bash
turso db show fuller-learning-companion --url     # -> TURSO_DATABASE_URL
turso db tokens create fuller-learning-companion  # -> TURSO_AUTH_TOKEN
```

Set both in Vercel (Production), redeploy, and confirm a student page loads. Anything
written to `pip-production` after the cutover is not in the old database; pull it with
`npm run db:pull` first if it matters. Delete the old database only once the new one
has run long enough to trust.

### Running it anywhere with a real disk

Leave `TURSO_DATABASE_URL` unset and the app opens a plain local file, exactly as it
does in development. That is all a host with a persistent disk needs — the driver,
the schema and every query are the same either way.

Note that only Next.js reads `.env.local`. Scripts run through tsx — `npm run verify`,
`db:reset`, `db:export`, `dev:session` — do not, so they use the local file unless you
export `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` into the environment yourself.

### Public access

The deployed site is open to anyone with its URL. There is no access gate and no
authentication behind it: the professor portal — overrides, notes, the student roster —
is usable by any visitor as the seeded professor, and a student session is a prototype
cookie, not an identity. Pages ask search engines not to index them (`robots: noindex`),
which is a request, not a control.

That is acceptable only because every record is fictional. Real student data needs the
authentication described in `docs/future-authentication-plan.md` first.

Vercel's Deployment Protection covers preview deployments and per-deployment URLs; the
production URL itself is public.

### Getting the join links right

Student join links and QR codes need to know the site's public address. On Vercel this
is automatic — the app falls back to `VERCEL_PROJECT_PRODUCTION_URL`, and to
`VERCEL_URL` on preview deployments. Anywhere else, set `APP_URL`.

Set `APP_URL` explicitly once you attach a custom domain, so a printed QR code points
at the domain rather than the `vercel.app` hostname.

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
libSQL (`libsql`), `qrcode`, Zod.

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

Colours, typography and the mark follow the brand board in `public/brand/New_Style.png`:
near-black `#0B0D16`, brand blue `#2F5BFF`, slate `#6C7A95`, light blue `#A7C1FF`,
white. Satoshi throughout
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
