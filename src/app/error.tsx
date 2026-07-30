"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route error boundary.
 *
 * Next.js redacts error messages in production builds, so the raw cause is only
 * available in the dev overlay and the server log. This page therefore does two
 * things instead of pretending to explain: it says where to look, and it names the
 * one recovery step that fixes the overwhelmingly common cause in a prototype
 * backed by a local database — a database that exists but was never seeded.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[flc] route error:", error);
  }, [error]);

  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-16 sm:px-6"
    >
      <p className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-brand-600">
        Prototype error
      </p>
      <h1 className="mt-3 font-serif text-3xl">This screen did not load</h1>

      <p className="mt-4 text-ink-600">
        Something threw on the server while rendering this page. The prototype has
        not lost any data — this is a rendering failure, not a corruption.
      </p>

      {/*
        Next.js replaces server error messages with a generic string in production
        builds, so this is only meaningful under `npm run dev`. Showing it there is
        the difference between diagnosing this in seconds and guessing.
      */}
      {error.message ? (
        <div className="mt-6">
          <h2 className="text-sm font-semibold">What actually threw</h2>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md border border-concern-200 bg-concern-50 px-3 py-2 text-[0.82rem] leading-relaxed text-concern-600">
            {error.message}
          </pre>
        </div>
      ) : null}

      <div className="mt-6 rounded-lg border border-tan-200 bg-paper-200 p-5">
        <h2 className="text-sm font-semibold">Things worth checking, in order</h2>

        <ol className="mt-3 space-y-4 text-sm text-ink-600">
          <li>
            <p className="font-medium text-ink-800">
              Was the build rebuilt or deleted while the server was running?
            </p>
            <p className="mt-1">
              <code>next start</code> reads route chunks from <code>.next</code> as
              they are first requested, so a rebuild underneath a live server breaks
              only the pages you have not visited yet — which looks exactly like
              this. Stop the server, then:
            </p>
            <pre className="mt-2 overflow-x-auto rounded border border-tan-200 bg-white px-3 py-2 text-[0.85rem]">
              npm run build && npm run start
            </pre>
          </li>

          <li>
            <p className="font-medium text-ink-800">
              Does the database hold seeded data?
            </p>
            <pre className="mt-2 overflow-x-auto rounded border border-tan-200 bg-white px-3 py-2 text-[0.85rem]">
              npm run db:reset
            </pre>
          </li>

          <li>
            <p className="font-medium text-ink-800">
              Is the project in a synced folder?
            </p>
            <p className="mt-1">
              iCloud, Dropbox and OneDrive copy and sometimes replace open files.
              Point the database somewhere unsynced:
            </p>
            <pre className="mt-2 overflow-x-auto rounded border border-tan-200 bg-white px-3 py-2 text-[0.85rem]">
              PROTOTYPE_DB_PATH=/tmp/flc.db npm run dev
            </pre>
          </li>
        </ol>

        <p className="mt-4 border-t border-tan-300 pt-3 text-sm text-ink-600">
          The full stack trace is in the terminal running the server. Under{" "}
          <code>npm run dev</code> it is also shown above and in the dev overlay;
          production builds omit it from the browser deliberately.
        </p>
      </div>

      {error.digest ? (
        <p className="mt-4 text-[0.82rem] text-ink-400">
          Error digest <code>{error.digest}</code> — search your server log for this
          to find the full stack trace.
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-none border border-cta-600 bg-cta-600 px-4 py-2.5 text-[0.95rem] font-medium text-white transition-colors hover:bg-cta-700"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-none border border-tan-300 bg-white px-4 py-2.5 text-[0.95rem] font-medium text-ink-800 no-underline transition-colors hover:bg-paper-100"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
