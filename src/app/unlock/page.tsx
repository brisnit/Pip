import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { product } from "@/config/product";
import { BrandLockup } from "@/components/ui/brand";
import { Card, CardBody, Notice } from "@/components/ui/primitives";
import { gateEnabled } from "@/lib/gate/access";
import { UnlockForm } from "./unlock-form";

export const metadata: Metadata = {
  title: "Access this prototype",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Nothing to unlock when no password is configured.
  if (!gateEnabled()) redirect("/");

  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      <main
        id="main"
        className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16 sm:px-6"
      >
        <BrandLockup href={null} />

        <h1 className="mt-8 font-serif text-3xl">{product.name}</h1>
        <p className="mt-3 text-ink-600">
          This prototype is shared for review and is not open to the public. Enter
          the access password you were given.
        </p>

        <Card className="mt-6">
          <CardBody>
            <UnlockForm next={next ?? "/"} />
          </CardBody>
        </Card>

        <Notice tone="caution" title="What this password is, and is not" className="mt-6">
          <p>
            One password shared by everyone with the link. It keeps this URL from
            being stumbled upon — it is <strong>not</strong> authentication, and it
            does not identify who you are or limit what you can see.
          </p>
          <p className="mt-2">
            Everything inside is fictional demonstration data. The application has no
            student accounts and is not a secure student-record system.
          </p>
        </Notice>
      </main>

      <footer className="border-t border-sand-100 bg-white">
        <div className="mx-auto max-w-lg px-4 py-6 text-[0.82rem] text-ink-500 sm:px-6">
          {product.name} — a prototype for {product.institution.name}. Not an
          official {product.institution.shortName} system.
        </div>
      </footer>
    </div>
  );
}
