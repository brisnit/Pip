import type { Metadata } from "next";
import Link from "next/link";
import { product } from "@/config/product";
import { PublicShell } from "@/components/layout/shells";
import { Card, CardBody, Notice } from "@/components/ui/primitives";
import { aiStatus } from "@/lib/ai";

export const metadata: Metadata = { title: "About" };

// Reports the live AI provider configuration, so it must not be prerendered.
export const dynamic = "force-dynamic";

export default function AboutPage() {
  const ai = aiStatus();

  return (
    <PublicShell>
      <h1 className="font-serif text-3xl">About</h1>
      <p className="mt-4 text-lg text-ink-600">{product.description}</p>

      <h2 className="mt-10 font-serif text-xl">What it does</h2>
      <p className="mt-3 text-ink-600">
        A professor publishes course material and lectures with comprehension
        checks attached. Students join through a link or QR code, work inside the
        lecture, and record what they understand and what they do not. The
        application turns that recorded activity into a readiness picture for each
        student, an aggregate picture for the class, and a set of concrete support
        recommendations drawn from the professor&rsquo;s own published material.
      </p>

      <h2 className="mt-10 font-serif text-xl">How readiness is calculated</h2>
      <p className="mt-3 text-ink-600">
        A weighted reading over several independent signals: in-lecture
        comprehension checks, practice and assessment answers, self-reported
        confidence, the balance of clear and confusing markers, breadth of lecture
        participation, and outstanding activity. Weights are renormalised over
        whichever signals actually have data, so a student is never penalised for
        an activity that does not exist yet.
      </p>
      <p className="mt-3 text-ink-600">
        Two rules are load-bearing. Readiness is never computed from attendance or
        presence alone. And asking questions is never scored against a student —
        curiosity is shown as context, never as evidence of a deficit. A direct
        request for help always outranks the computed score.
      </p>
      <p className="mt-3 text-ink-600">
        Where the evidence is thin, the application says{" "}
        <em>not enough information yet</em> rather than guessing, and it always
        shows the reasoning behind a status. Professors can override any status,
        with a required explanation.
      </p>
      <p className="mt-3 text-ink-600">
        Readiness is not a grade. It carries no academic weight, is not reported to
        any registrar, and exists to prompt a conversation early rather than to
        judge anyone.
      </p>

      <h2 className="mt-10 font-serif text-xl">Privacy of student notes</h2>
      <p className="mt-3 text-ink-600">
        Student notes are private by default. A professor can see aggregated
        comprehension data, questions a student intentionally submitted, notes a
        student explicitly shared, assessment responses, and support requests.
        Nothing else. This is enforced in the data layer, not only in the
        interface.
      </p>

      <h2 className="mt-10 font-serif text-xl">AI assistance</h2>
      <Card className="mt-3">
        <CardBody>
          <p className="text-sm">
            <span className="font-semibold">Current provider:</span>{" "}
            {ai.providerLabel}
          </p>
          {ai.requested && !ai.configured ? (
            <p className="mt-2 text-sm text-attention-600">
              <code>AI_PROVIDER</code> is set to <code>{ai.requested}</code>, which
              is not implemented. Deterministic output is being used instead.
            </p>
          ) : null}
          <p className="mt-2 text-sm text-ink-500">
            Every AI-assisted feature runs through a provider interface. With no
            provider connected, the application restructures content the professor
            already entered and labels it as such wherever it appears — it does not
            imply a model is running. Course-wide generated material stays a draft
            until a professor approves it.
          </p>
        </CardBody>
      </Card>

      <h2 className="mt-10 font-serif text-xl">Current scope</h2>
      <p className="mt-3 text-ink-600">
        This is an early build, and some things it appears to do are deliberately
        not connected yet:
      </p>
      <ul className="mt-3 space-y-2 text-ink-600">
        <li>
          <strong>No sign-in.</strong> Professors enter directly and students
          identify themselves by name. Institutional single sign-on is the first
          item of production work.
        </li>
        <li>
          <strong>No file storage.</strong> Materials record a filename and size;
          nothing is uploaded, and every screen showing a filename says so.
        </li>
        <li>
          <strong>No video hosting.</strong> Lectures embed or link to an external
          provider.
        </li>
        <li>
          <strong>No notifications or scheduling.</strong> Support requests create
          records for the professor to act on; nothing is emailed or booked.
        </li>
        <li>
          <strong>No automated grading of written work.</strong> Short answers and
          essays are stored for a person to read.
        </li>
      </ul>
      <p className="mt-3 text-ink-600">
        Course and student data shown here is illustrative. Handling real student
        records would require the security, access-control and institutional review
        described in the project documentation.
      </p>

      <Notice tone="privacy" title="Student records" className="mt-8">
        Before this holds real coursework, it needs authentication, role-based
        access, audit logging, a retention policy, and legal and institutional
        review — including FERPA. Those are scoped in the repository documentation
        and are not yet built.
      </Notice>

      <h2 className="mt-10 font-serif text-xl">Brand</h2>
      <p className="mt-3 text-ink-600">
        Colours, typography and the logo follow the {product.institution.name} style
        guide. The logo is served from this application&rsquo;s own origin, and the
        two typefaces — Noto Serif and Noto Sans — are self-hosted, so no request
        goes to a third party while you are using it.
      </p>

      <p className="mt-10">
        <Link href="/">← Back to home</Link>
      </p>
    </PublicShell>
  );
}
