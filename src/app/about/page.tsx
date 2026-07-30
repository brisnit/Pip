import type { Metadata } from "next";
import Link from "next/link";
import { product } from "@/config/product";
import { PublicShell } from "@/components/layout/shells";
import { Card, CardBody, Notice } from "@/components/ui/primitives";
import { aiStatus } from "@/lib/ai";

export const metadata: Metadata = { title: "About this prototype" };

// Reports the live AI provider configuration, so it must not be prerendered.
export const dynamic = "force-dynamic";

export default function AboutPage() {
  const ai = aiStatus();

  return (
    <PublicShell>
      <h1 className="font-serif text-3xl">About this prototype</h1>
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

      <h2 className="mt-10 font-serif text-xl">What it deliberately does not do</h2>
      <ul className="mt-3 space-y-2 text-ink-600">
        <li>
          <strong>No authentication.</strong> There are no accounts, passwords or
          single sign-on. The professor portal is open, and students identify
          themselves by typing a name. Anyone with a course link can enter.
        </li>
        <li>
          <strong>No student information system integration.</strong> Nothing here
          reads from or writes to any registrar, LMS or grading system.
        </li>
        <li>
          <strong>No grades.</strong> Readiness statuses are prototype signals.
          They carry no academic weight and are not reported anywhere.
        </li>
        <li>
          <strong>No file storage.</strong> Uploads record filename and size only.
          The metadata-only adapter is honest about this wherever it appears.
        </li>
        <li>
          <strong>No video hosting.</strong> Lectures embed or link to an external
          provider. Where no real URL exists, the player says so.
        </li>
        <li>
          <strong>No real notifications.</strong> Support requests create internal
          records. No email or SMS is sent, and no calendar is booked.
        </li>
        <li>
          <strong>No essay grading.</strong> Short-answer and essay responses are
          stored verbatim for a human to read. The application does not score
          theological writing.
        </li>
      </ul>

      <Notice tone="privacy" title="Not FERPA compliant" className="mt-8">
        This prototype is not FERPA compliant and must not hold real student
        records. Production use would require legal, security, operational and
        institutional review — including authentication, role-based access, audit
        logging, retention policy and an institutional agreement. See{" "}
        <code className="rounded bg-white/60 px-1 py-0.5 text-[0.85em]">
          docs/privacy-and-student-data-considerations.md
        </code>{" "}
        in the repository.
      </Notice>

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
              <code>AI_PROVIDER</code> is set to{" "}
              <code>{ai.requested}</code>, which is not implemented in this
              prototype. Deterministic sample output is being used instead.
            </p>
          ) : null}
          <p className="mt-2 text-sm text-ink-500">
            Every AI-assisted feature runs through a provider interface. With no
            provider configured, the application returns deterministic output
            assembled from content the professor already entered, labelled as
            sample output wherever it appears. It does not claim a model is
            running. Course-wide generated material stays a draft until a
            professor approves it.
          </p>
        </CardBody>
      </Card>

      <h2 className="mt-10 font-serif text-xl">Brand</h2>
      <p className="mt-3 text-ink-600">
        Colours, typography and the logo follow the {product.institution.name} style
        guide supplied for this project. The logo is served from this application&rsquo;s
        own origin, and the two typefaces — Noto Serif and Noto Sans — are downloaded at
        build time and self-hosted, so no request goes to a third party while you are
        using the prototype.
      </p>

      <p className="mt-10">
        <Link href="/">← Back to home</Link>
      </p>
    </PublicShell>
  );
}
