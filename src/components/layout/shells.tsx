import Link from "next/link";
import type { ReactNode } from "react";
import { product } from "@/config/product";
import { BrandLockup } from "@/components/ui/brand";
import { NavList, NavTabs, type NavItem } from "./nav";
import { PrototypeBanner } from "./prototype-banner";

/** Shared page frame: banner, masthead, main landmark, footer. */
function Frame({
  masthead,
  subnav,
  children,
  aside,
}: {
  masthead: ReactNode;
  subnav?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PrototypeBanner />
      <header className="border-b border-tan-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">{masthead}</div>
        {subnav ? (
          <div className="mx-auto max-w-6xl border-t border-tan-100 px-4 sm:px-6">
            {subnav}
          </div>
        ) : null}
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-8 sm:px-6">
        {aside ? (
          <aside className="hidden w-56 shrink-0 lg:block">{aside}</aside>
        ) : null}
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      <footer className="border-t border-tan-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-[0.82rem] text-ink-500 sm:px-6">
          <p>
            {product.name} — {product.institution.name}.
          </p>
          <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/about">About</Link>
            <Link href="/">Home</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

// Professor ------------------------------------------------------------------

export function ProfessorShell({
  professorName,
  courseNav,
  courseTitle,
  courseCode,
  children,
}: {
  professorName: string;
  courseNav?: NavItem[];
  courseTitle?: string;
  courseCode?: string;
  children: ReactNode;
}) {
  const topNav: NavItem[] = [
    { href: "/professor/dashboard", label: "Dashboard" },
    { href: "/professor/courses", label: "Courses", nested: true },
  ];

  return (
    <Frame
      masthead={
        <div className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex min-w-0 items-center gap-5">
            <BrandLockup />
            <span className="hidden rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[0.72rem] font-semibold uppercase tracking-wide text-brand-700 sm:inline">
              Professor portal
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-ink-500">
              Acting as{" "}
              <span className="font-medium text-ink-800">{professorName}</span>
            </span>
            <Link href="/" className="text-brand-600">
              Exit
            </Link>
          </div>
        </div>
      }
      subnav={
        <div className="flex flex-col gap-1">
          <NavTabs items={topNav} label="Professor sections" />
          {courseNav ? (
            <div className="border-t border-tan-100 pt-1">
              {courseTitle ? (
                <p className="pb-1 pt-1.5 text-[0.78rem] uppercase tracking-wide text-ink-400">
                  {courseCode} · {courseTitle}
                </p>
              ) : null}
              <NavTabs items={courseNav} label="Course sections" />
            </div>
          ) : null}
        </div>
      }
    >
      {children}
    </Frame>
  );
}

export function professorCourseNav(courseId: string): NavItem[] {
  const base = `/professor/courses/${courseId}`;
  return [
    { href: base, label: "Overview" },
    { href: `${base}/content`, label: "Content & lectures", nested: true },
    { href: `${base}/students`, label: "Students", nested: true },
    { href: `${base}/insights`, label: "Comprehension" },
    { href: `${base}/assessments`, label: "Assessments", nested: true },
    { href: `${base}/support`, label: "Support" },
  ];
}

// Student --------------------------------------------------------------------

export function StudentShell({
  studentName,
  courseId,
  courseTitle,
  courseCode,
  professorName,
  nav,
  children,
}: {
  studentName: string;
  courseId: string;
  courseTitle: string;
  courseCode: string;
  professorName: string;
  nav?: NavItem[];
  children: ReactNode;
}) {
  const items = nav ?? studentCourseNav(courseId);

  return (
    <Frame
      masthead={
        <div className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex min-w-0 items-center gap-5">
            <BrandLockup />
            <div className="hidden min-w-0 border-l border-tan-200 pl-5 sm:block">
              <p className="truncate font-serif text-[0.95rem] text-ink-800">
                {courseCode} · {courseTitle}
              </p>
              <p className="text-[0.8rem] text-ink-500">{professorName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-ink-500">
              Signed in as{" "}
              <span className="font-medium text-ink-800">{studentName}</span>
            </span>
            <Link href="/join" className="text-brand-600">
              Switch course
            </Link>
          </div>
        </div>
      }
      subnav={
        <div className="lg:hidden">
          <NavTabs items={items} label="Course sections" />
        </div>
      }
      aside={
        <div className="sticky top-6 space-y-6">
          <NavList items={items} label="Course sections" />
          <div className="rounded-md border border-tan-100 bg-paper-50 p-3 text-[0.8rem] text-ink-500">
            <p className="font-semibold text-ink-700">Your notes are private</p>
            <p className="mt-1">
              Your professor sees aggregated comprehension data, questions you
              submit, and notes you choose to share — never your private notes.
            </p>
          </div>
        </div>
      }
    >
      {children}
    </Frame>
  );
}

export function studentCourseNav(courseId: string): NavItem[] {
  const base = `/student/${courseId}`;
  return [
    { href: base, label: "Course home" },
    { href: `${base}/lecture`, label: "Lectures", nested: true },
    { href: `${base}/notes`, label: "Notes" },
    { href: `${base}/readiness`, label: "Study readiness" },
    { href: `${base}/assessments`, label: "Assessments", nested: true },
    { href: `${base}/support`, label: "Support plan" },
    { href: `${base}/resources`, label: "Resources" },
  ];
}

// Public ---------------------------------------------------------------------

export function PublicShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PrototypeBanner />
      <header className="border-b border-tan-100 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandLockup size="md" />
          <nav aria-label="Main" className="flex items-center gap-5 text-sm">
            <Link href="/about">About</Link>
            <Link href="/professor">Professor portal</Link>
            <Link href="/join">Join a course</Link>
          </nav>
        </div>
      </header>
      <main
        id="main"
        className={`mx-auto w-full flex-1 px-4 py-10 sm:px-6 ${
          wide ? "max-w-5xl" : "max-w-3xl"
        }`}
      >
        {children}
      </main>
      <footer className="border-t border-tan-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 text-[0.82rem] text-ink-500 sm:px-6">
          <p>
            {product.name} — {product.institution.name}.
          </p>
        </div>
      </footer>
    </div>
  );
}
