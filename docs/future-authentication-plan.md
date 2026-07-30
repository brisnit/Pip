# Future authentication plan

## Where the prototype stands

There is no authentication. This is deliberate for the current phase, and it is
stated on every screen.

- **Professors** enter through `/professor` with no credential. The portal operates
  as the single seeded professor record.
- **Students** enter through a course link or code, type a name, tick a consent
  box, and receive an httpOnly session cookie. Nothing is verified.

Anyone with a course link can enter as any name, including a name already in use.
That is a real hole, and the join screens say so in as many words.

## The one function that has to change

Everything the application knows about "who is acting" comes from
`src/lib/role/role-context.ts`. Nothing else asks.

```ts
export function requireProfessor(): ProfessorContext {
  return {
    role: "professor",
    professor: getActiveProfessor(),   // ← the whole prototype assumption
    unauthenticated: true,
  }
}

export async function currentStudent(): Promise<StudentContext | null>
export async function currentStudentInCourse(courseId: string): Promise<StudentContext | null>
```

Adding authentication means changing these three functions and nothing above them.
Concretely:

- `requireProfessor()` resolves a session, then a `professors` row, then throws or
  redirects when absent. Its return type already carries `unauthenticated: true`,
  which becomes `false` — a compile-time nudge at every call site that cares.
- `currentStudent()` resolves an authenticated student rather than a name-based
  prototype session.
- `currentStudentInCourse()` keeps its signature and keeps enforcing enrolment.

The routes, the repositories and the domain models do not change. That is the
property the current structure exists to preserve.

## What already behaves correctly

These were built as if authentication existed, so they will not need revisiting.

**Server-side authority on identity.** Every student server action derives the
acting student **and the course** from the session, never from the submitted form:

```ts
async function actingStudent(courseId: string) {
  const student = await currentStudent()
  if (!student) return null
  if (student.courseId !== courseId) return null   // forged courseId writes nothing
  return student
}
```

**Ownership checks in SQL.** `deleteNote`, `setNoteShared` and `deleteBookmark` all
carry `AND student_id = ?`. A student cannot act on another student's row even with
a valid ID.

**Privacy enforced in the data layer.** `listSharedNotes()` hard-codes
`shared_with_professor = 1`; student-facing material queries filter to
`visibility = 'students'`. Neither depends on the UI getting it right.

**`server-only` guards.** Every repository, the database client, the role context
and the AI module import `server-only`. Importing one into a client component is a
build error.

**Server-side validation.** Zod schemas on every substantial form. Client
validation is a convenience, not a control.

**Closed vocabularies.** Enum values are validated against declared sets
(`oneOf()`, `z.enum()`), so a crafted form field cannot write an unexpected status
or pathway.

## What must change before any real deployment

### 1. Institutional single sign-on

Fuller almost certainly runs SAML or OIDC. The integration should:

- Federate rather than store passwords. No local credentials, no password reset, no
  account recovery — which is why none of that was built.
- Map the identity provider's role claims onto application roles.
- Handle just-in-time provisioning for a first-time signer-in.
- Honour institutional session lifetime and single logout.

### 2. Roles

`PlannedRole` already names the two the architecture anticipates:

| Role | Sees | Notes |
| --- | --- | --- |
| Professor | Their own courses, in full | Exists |
| Student | Their own work; class-level aggregates only | Exists |
| Teaching assistant | Assigned courses; questions and support requests; **no readiness overrides** | Planned |
| Administrator | Course and roster administration; **no student note content** | Planned |

The TA role is the more urgent of the two, because the support model already routes
work to a named teaching assistant who currently has no way to see it.

### 3. Authorisation, not just authentication

Knowing who someone is does not tell you what they may see. Needed:

- **Course-scoped checks on every route.** `/professor/courses/[courseId]` must
  verify that this professor teaches this course. Today it verifies only that the
  course exists.
- **A policy layer**, so authorisation is one function per resource rather than a
  condition scattered across route handlers.
- **Server-action authorisation.** Actions currently trust that a professor is a
  professor.
- **Object-level checks on IDs in URLs.** Course, lecture, student and assessment
  IDs are all guessable-shaped; today only course membership is checked, and only
  for students.

### 4. Student identity

Replace name-matching entirely. The current `joinCourse()` matches on
`LOWER(name) = LOWER(?)` within a course so a student who clears their cookie can
return to their own work. It is defensible only because this is an unauthenticated
prototype, and it is listed as a known limitation in the privacy document.

Course links and QR codes remain useful after authentication — as a *join* gesture
for an authenticated user, not as an identity claim.

### 5. Session security

| Concern | Now | Needed |
| --- | --- | --- |
| Cookie | httpOnly, sameSite=lax, secure in production | Same, plus rotation on privilege change |
| Lifetime | 7 days, fixed | Institutional policy; idle timeout |
| Revocation | None | Server-side invalidation, "sign out everywhere" |
| CSRF | Next.js server-action origin checks | Explicit token verification on state-changing routes |
| Rate limiting | None | On join, and on all write actions |

### 6. Audit logging

`activity_events` records coursework activity, and `support_actions` records support
decisions. Neither is an access log. A production system needs an append-only record
of *who viewed which student's record, when* — see the privacy document.

## Migration path

Ordered so that nothing is thrown away.

1. **Add an identity table** (`user_accounts`) with the IdP subject as the external
   key, linked to `professors` and `students`. Do not repurpose `students.email` as
   an identity key.
2. **Implement SSO** and swap the three `role-context.ts` functions.
3. **Add the policy layer** and apply it at every route and action. This is the
   largest piece of work and the one that must not be skipped.
4. **Add the TA and administrator roles**, with their own scoped views.
5. **Add access audit logging** before any real student data is loaded.
6. **Retire prototype entry.** Remove name-based join; keep code-and-QR join for
   authenticated users. Remove the seeded professor fallback.
7. **Delete all prototype data.** Seeded records are flagged `is_demo = 1`
   precisely so this is a one-line delete rather than an archaeology exercise.

## What deliberately was not built

Per the brief, and worth restating so nobody looks for it: no login, no password
handling, no password reset, no account recovery, no billing, no SSO, no email or
SMS delivery. Building any of it now would have meant building it twice — once as a
prototype stub and once properly against the institution's actual identity
provider.
