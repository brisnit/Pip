import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-16 sm:px-6"
    >
      <p className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-burgundy-600">
        Not found
      </p>
      <h1 className="mt-3 font-serif text-3xl">
        There is nothing at this address
      </h1>

      <p className="mt-4 text-ink-600">
        The course, lecture or student you are looking for does not exist in this
        prototype — or the course code has been rotated since the link was shared.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/professor/dashboard"
          className="inline-flex items-center justify-center rounded-md border border-burgundy-600 bg-burgundy-600 px-4 py-2.5 text-[0.95rem] font-medium text-cream-50 no-underline transition-colors hover:bg-burgundy-700"
        >
          Professor portal
        </Link>
        <Link
          href="/join"
          className="inline-flex items-center justify-center rounded-md border border-sand-200 bg-white px-4 py-2.5 text-[0.95rem] font-medium text-ink-800 no-underline transition-colors hover:bg-cream-100"
        >
          Join a course
        </Link>
      </div>
    </main>
  );
}
