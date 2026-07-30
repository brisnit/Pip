# Current-state audit

Written before any code was added, and updated at the end of the build to record
what actually exists now.

## What the repository contained at the start

Nothing. The working directory `Pip Learning Companion/` held a single `.claude/`
configuration folder and no source files, no `package.json`, no framework, no git
history, and no brand assets.

The task brief said "you are working inside an existing application repository."
That was not the case here, so there was no existing framework to respect and no
existing components to reuse. This is recorded plainly because it changes the
shape of the work: everything below is a greenfield decision rather than an
adaptation.

One thing was inherited — the parent directory's `CLAUDE.md`, which describes a
"WAT framework" (Workflows / Agents / Tools) with Python tools in `tools/` and
markdown SOPs in `workflows/`. That convention governs the parent workspace's
automation scripts, not a Next.js web application, and neither directory existed
here. It has not been imposed on this codebase; the equivalent separation is
served by the layering described in `product-architecture.md`.

### Environment as found

| Item | Version |
| --- | --- |
| Node | 24.16.0 |
| npm | 11.13.0 |
| pnpm / yarn | not installed |
| git repository | no |
| Platform | macOS (darwin 25.5.0) |

## Decisions taken, and why

Because there was no framework to follow, each choice below was made once and is
recorded so it can be argued with later.

**Next.js 16 (App Router) + React 19 + TypeScript.** Scaffolded with
`create-next-app`. Server components let every screen read the database directly
without an API layer, which keeps the prototype small; server actions cover
writes without hand-rolled endpoints. The `--src-dir` and `@/*` import-alias
defaults were kept.

*Note:* npm refused the directory name "Pip Learning Companion" (capitals and
spaces are invalid package names), so the scaffold was generated in a temporary
directory and moved in. The package is named `fuller-learning-companion`.

**SQLite via better-sqlite3.** The brief asked for persistent, database-backed
prototype data and warned against holding core relationships in unstructured
JSON. SQLite gives real tables, real foreign keys and real joins with no service
to run. Verified working on Node 24 before anything was built on it. The file
lives at `.data/prototype.db` and is gitignored.

**Tailwind CSS v4 with a token layer.** Design tokens are declared once in
`@theme` in `src/app/globals.css` — the burgundy / cream / sand / ink / gold
palette and the four readiness status ramps — so no component hard-codes a hex
value.

**No component library.** A small set of primitives in `src/components/ui/`
covers everything the app needs. Bringing in a UI kit would have meant fighting
its defaults on the two things that mattered most here: accessible status
indicators that do not rely on colour, and form fields that wire up
`aria-describedby` and `aria-invalid` correctly.

**`qrcode` for QR generation, server-side, inline SVG.** A real library as the
brief required. Generating on the server means the course URL is never sent to a
third-party QR service.

**Zod for server-side validation** of the larger forms (course, lecture,
material, assessment, support recommendation), so validation is not a client-side
courtesy.

**No fonts fetched at build or runtime.** The type stack is a system serif
(Iowan Old Style → Palatino → Georgia) for headings and system sans for body
text. This keeps the build offline-capable and avoids third-party font requests
from a page that displays student-shaped records. Swapping in a licensed
institutional face means changing two custom properties.

### Dependencies added

| Package | Purpose |
| --- | --- |
| `better-sqlite3` | prototype persistence |
| `qrcode` | server-side QR generation |
| `zod` | server-side form validation |
| `server-only` | build-time guard on server modules |
| `tsx` (dev) | running the verification and helper scripts |

## What exists now

```
src/
  config/product.ts          product name, institution framing, prototype notices
  app/
    (public)                 /, /about, /professor, /join, /join/[courseCode]
    professor/               11 screens — see product-architecture.md
    student/[courseId]/       8 screens
    professor/actions.ts     professor server actions (validated)
    student/actions.ts       student server actions (validated, session-scoped)
  components/
    ui/                      primitives, status indicators, forms, AI labels
    layout/                  shells, navigation, prototype banner
    course/                  QR code, access panel, printable access card
    lecture/                 video provider abstraction, rich text, interaction cards
  lib/
    db/                      schema, client, seed, ids
    domain/                  vocabulary, readiness model, support model  ← pure
    repositories/            one module per area, typed rows
    ai/                      provider interface + deterministic prototype provider
    role/                    PrototypeRoleContext
    forms/                   shared action-state shape
scripts/
  verify-prototype.mts       60 data-layer + vertical-slice assertions
  smoke.sh                   135 rendering assertions against a live server
  reset-db.mts               drop and re-seed
  dev-session.mts            mint a student session for a demo
docs/                        the eight documents this brief requires
```

29 routes. Typecheck, lint and production build all clean. See the README for how
to run the two verification suites.

## Known gaps, honestly

- **No unit test runner.** Correctness is covered by the two assertion suites
  above, which exercise the real database and the real rendered HTML. That was a
  better use of the time than wiring up Vitest for a prototype, but it means
  there is no fast per-function test loop. Adding one is a small job: the
  readiness and support models are already pure functions with explicit inputs.
- **No git repository.** Nothing has been committed; `git init` has not been run,
  in line with not taking irreversible actions unasked.
- **`create-next-app` reported 12 high-severity advisories** in its transitive
  dependency tree at scaffold time. Not investigated. Worth resolving before this
  goes anywhere real.
- **One Turbopack build warning remains**, about file tracing widening because
  `client.ts` resolves a database path at runtime. It is a tracing hint, not a
  correctness problem, and the path is already scoped to `process.cwd()`.
- **The single-professor assumption** is baked into `getActiveProfessor()`. That
  is deliberate and isolated to one function — see
  `future-authentication-plan.md`.
