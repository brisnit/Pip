import Link from "next/link";
import { product } from "@/config/product";
import { PublicShell } from "@/components/layout/shells";
import { ButtonLink, Card, CardBody, Notice } from "@/components/ui/primitives";

export default function LandingPage() {
  return (
    <PublicShell wide>
      <div className="max-w-2xl">
        <p className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-brand-600">
          {product.institution.name}
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-[1.08] tracking-tight sm:text-5xl">
          {product.tagline}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-600">
          {product.name} turns a course&rsquo;s own materials into an interactive
          learning environment. Professors see where a class is genuinely
          struggling while there is still time to teach into it. Students see
          exactly which topics need another pass before the exam — and what to do
          about each one.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/professor">Enter professor portal</ButtonLink>
        <ButtonLink href="/join" variant="secondary">
          Student portal
        </ButtonLink>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          {
            step: "The professor publishes",
            body: "Syllabus, lecture notes, readings, recordings and comprehension checks — organised by module and tied to learning objectives.",
          },
          {
            step: "The student works",
            body: "Watches or attends, takes timestamped notes, marks what is clear and what is not, asks questions in context, answers checks.",
          },
          {
            step: "Both see the same picture",
            body: "Which objectives hold up, which need review, and which support pathway fits — named, explained, and actionable.",
          },
        ].map((item, index) => (
          <Card key={item.step}>
            <CardBody>
              <p
                aria-hidden="true"
                className="font-serif text-2xl text-accent-600"
              >
                {index + 1}
              </p>
              <h2 className="mt-1 text-base font-semibold">{item.step}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                {item.body}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="font-serif text-xl">For professors</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li>Which students would benefit from a conversation this week</li>
              <li>Which concepts the class marked confusing, and where</li>
              <li>Which learning objectives the evidence does not yet support</li>
              <li>Which questions are still waiting for an answer</li>
              <li>What to revisit at the start of the next lecture</li>
            </ul>
            <p className="mt-4">
              <Link href="/professor">Open the professor portal →</Link>
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-serif text-xl">For students</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li>Notes anchored to the exact moment in the lecture</li>
              <li>A way to say &ldquo;this part is not landing&rdquo; without raising your hand</li>
              <li>An honest read on which topics need another pass</li>
              <li>A support plan with real next steps, not just a warning</li>
              <li>Notes that stay private unless you choose to share them</li>
            </ul>
            <p className="mt-4">
              <Link href="/join">Join with a course code →</Link>
            </p>
          </CardBody>
        </Card>
      </div>

      <Notice tone="info" className="mt-12">
        Readiness statuses are computed from recorded coursework activity. They are
        designed to prompt a conversation early — they are not grades and carry no
        academic weight.{" "}
        <Link href="/about">How readiness is calculated.</Link>
      </Notice>
    </PublicShell>
  );
}
