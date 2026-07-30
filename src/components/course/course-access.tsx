import QRCode from "qrcode";
import { product, courseJoinUrl } from "@/config/product";
import { Card, CardBody, Notice } from "@/components/ui/primitives";
import { CopyButton } from "./copy-button";

/**
 * Renders a real QR code for the student join URL.
 *
 * Generated server-side as inline SVG with the `qrcode` library, so no image is
 * fetched and no third-party QR service sees the course URL.
 */
async function qrSvg(url: string, size: number): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: size,
    color: { dark: "#3d111a", light: "#ffffff" },
  });
}

export async function CourseQr({
  accessCode,
  size = 220,
  className,
}: {
  accessCode: string;
  size?: number;
  className?: string;
}) {
  const url = courseJoinUrl(accessCode);
  const svg = await qrSvg(`${url}?via=qr`, size);

  return (
    <figure className={className}>
      <div
        // The QR code is decorative here: the URL and the code are both printed
        // as text below it, so a screen-reader user is never dependent on it.
        aria-hidden="true"
        className="inline-block rounded-md border border-sand-200 bg-white p-2 [&_svg]:block"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="mt-2 text-[0.8rem] text-ink-500">
        Scan to join, or enter the code below at{" "}
        <span className="font-medium text-ink-700">/join</span>.
      </figcaption>
    </figure>
  );
}

/** Copyable link and code block for the course overview screen. */
export async function CourseAccessPanel({
  accessCode,
  courseId,
}: {
  accessCode: string;
  courseId: string;
}) {
  const url = courseJoinUrl(accessCode);

  return (
    <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
      <CourseQr accessCode={accessCode} size={180} />

      <div className="min-w-0 space-y-4">
        <div>
          <p className="text-[0.78rem] font-medium uppercase tracking-wide text-ink-400">
            Course code
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="font-mono text-2xl tracking-[0.2em] text-burgundy-700">
              {accessCode}
            </p>
            <CopyButton value={accessCode} label="Copy code" />
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[0.78rem] font-medium uppercase tracking-wide text-ink-400">
            Student link
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <code className="min-w-0 break-all rounded border border-sand-100 bg-cream-100 px-2 py-1 text-[0.82rem]">
              {url}
            </code>
            <CopyButton value={url} label="Copy link" />
          </div>
        </div>

        <p className="text-sm text-ink-500">
          Display the QR code during class, or read the six-character code aloud.
          Both routes reach the same place.{" "}
          <a href={`/professor/courses/${courseId}/access-card`}>
            Open the printable access card
          </a>
          .
        </p>
      </div>
    </div>
  );
}

/** A single printable card a professor can put on a projector or a wall. */
export async function PrintableAccessCard({
  courseCode,
  courseTitle,
  professorName,
  term,
  accessCode,
}: {
  courseCode: string;
  courseTitle: string;
  professorName: string;
  term: string | null;
  accessCode: string;
}) {
  const url = courseJoinUrl(accessCode);

  return (
    <Card className="mx-auto max-w-xl">
      <CardBody className="text-center">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-burgundy-600">
          {product.institution.name}
        </p>
        <h2 className="mt-3 font-serif text-2xl">
          {courseCode} — {courseTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          {professorName}
          {term ? ` · ${term}` : ""}
        </p>

        <div className="mt-6 flex justify-center">
          <CourseQr accessCode={accessCode} size={260} />
        </div>

        <div className="mt-6 border-t border-sand-100 pt-6">
          <p className="text-[0.78rem] font-medium uppercase tracking-wide text-ink-400">
            Or go to
          </p>
          <p className="mt-1 break-all font-mono text-sm text-ink-800">{url}</p>
          <p className="mt-4 text-[0.78rem] font-medium uppercase tracking-wide text-ink-400">
            Course code
          </p>
          <p className="mt-1 font-mono text-3xl tracking-[0.22em] text-burgundy-700">
            {accessCode}
          </p>
        </div>

        <Notice tone="caution" className="mt-6 text-left no-print">
          Anyone with this code can enter the course as any name. Do not post it
          publicly while the prototype has no authentication.
        </Notice>
      </CardBody>
    </Card>
  );
}
