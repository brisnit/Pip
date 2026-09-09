import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-16 sm:px-6"
    >
      <p className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-brand-600">
        Not found
      </p>
      <h1 className="mt-3 text-3xl">There is nothing at this address</h1>

      <p className="mt-4 text-ink-600">
        The course, lecture or student you are looking for does not exist — or
        the course code has been rotated since the link was shared.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/professor/dashboard"
          className="inline-flex h-11 items-center justify-center rounded-full border border-ink-900 bg-ink-900 px-5 text-[0.94rem] font-medium text-white no-underline transition-colors hover:bg-ink-800"
        >
          Professor portal
        </Link>
        <Link
          href="/join"
          className="inline-flex h-11 items-center justify-center rounded-full border border-transparent bg-paper-200 px-5 text-[0.94rem] font-medium text-ink-900 no-underline transition-colors hover:bg-paper-300"
        >
          Student portal
        </Link>
      </div>
    </main>
  );
}
