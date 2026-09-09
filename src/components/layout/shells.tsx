import Link from "next/link";
import type { ReactNode } from "react";
import { product } from "@/config/product";
import { BrandLockup } from "@/components/ui/brand";
import { FloatingNav, NavList, NavTabs, type NavItem } from "./nav";
import { PrototypeBanner } from "./prototype-banner";

/**
 * The application shell.
 *
 * Minimal chrome: no boxed header with a rule beneath it, no framed sidebar. The
 * masthead floats on the page canvas, content sits directly on it, and the only
 * drawn surfaces are the cards. That is most of what makes this read as a consumer
 * product rather than an admin console — the background is a room, not a table.
 *
 * On mobile the section navigation becomes a floating bar detached from the bottom
 * edge; `main` and the footer carry matching bottom padding so the bar never covers
 * the last thing on the page.
 */
function Frame({
  masthead,
  subnav,
  children,
  aside,
  floating,
  floatingLabel,
}: {
  masthead: ReactNode;
  subnav?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  floating?: NavItem[];
  floatingLabel?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PrototypeBanner />

      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--page)_78%,transparent)] backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-5 sm:px-7">{masthead}</div>
        {subnav ? (
          <div className="mx-auto max-w-6xl px-5 pb-2.5 sm:px-7">{subnav}</div>
        ) : null}
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-10 px-5 pb-24 pt-8 sm:px-7 lg:pb-14">
        {aside ? (
          <aside className="hidden w-60 shrink-0 lg:block">{aside}</aside>
        ) : null}
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      <footer className="mt-auto px-5 pb-28 pt-4 sm:px-7 lg:pb-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[0.82rem] text-ink-400">
          <p>
            {product.name} · {product.strapline}
          </p>
          <p className="flex flex-wrap gap-x-5">
            <Link href="/about" className="no-underline hover:underline">
              About
            </Link>
            <Link href="/" className="no-underline hover:underline">
              Home
            </Link>
          </p>
        </div>
      </footer>

      {floating ? (
        <FloatingNav items={floating} label={floatingLabel ?? "Sections"} />
      ) : null}
    </div>
  );
}

/**
 * The identity line: who you are acting as, and the way out.
 *
 * A text pair rather than an account menu, because there is no account system behind
 * it — a dropdown would imply one.
 */
function Identity({
  prefix,
  name,
  href,
  exitHref,
  exitLabel,
}: {
  prefix: string;
  name: string;
  href: string;
  exitHref: string;
  exitLabel: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Link
        href={href}
        className="flex h-10 items-center gap-2 rounded-full px-3 text-[0.88rem] no-underline transition-colors hover:bg-paper-200"
      >
        <span className="hidden text-ink-400 lg:inline">{prefix}</span>
        <span className="max-w-[9rem] truncate font-medium text-ink-900">
          {name}
        </span>
      </Link>
      <Link
        href={exitHref}
        className="hidden h-10 items-center rounded-full px-4 text-[0.88rem] text-ink-500 no-underline transition-colors hover:bg-paper-200 hover:text-ink-900 sm:inline-flex"
      >
        {exitLabel}
      </Link>
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
    { href: "/professor/dashboard", label: "Dashboard", icon: "dashboard" },
    {
      href: "/professor/courses",
      label: "Courses",
      nested: true,
      icon: "courses",
    },
    { href: "/professor/students", label: "Students", icon: "students" },
    { href: "/professor/profile", label: "Profile", icon: "profile" },
  ];

  return (
    <Frame
      floating={topNav}
      floatingLabel="Professor sections"
      masthead={
        <div className="flex h-[4.5rem] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLockup />
            <span className="hidden rounded-full bg-paper-200 px-3 py-1 text-[0.76rem] font-medium text-ink-500 md:inline">
              Teaching
            </span>
          </div>
          <Identity
            prefix="Acting as"
            name={professorName}
            href="/professor/profile"
            exitHref="/"
            exitLabel="Exit"
          />
        </div>
      }
      subnav={
        <div className="flex flex-col gap-2">
          <div className="hidden lg:block">
            <NavTabs items={topNav} label="Professor sections" />
          </div>
          {courseNav ? (
            <div className="flex flex-col gap-1.5">
              {courseTitle ? (
                <p className="truncate text-[0.8rem] text-ink-400">
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
      floating={items}
      floatingLabel="Course sections"
      masthead={
        <div className="flex h-[4.5rem] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <BrandLockup />
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-[0.9rem] font-medium text-ink-900">
                {courseCode} · {courseTitle}
              </p>
              <p className="truncate text-[0.8rem] text-ink-400">
                {professorName}
              </p>
            </div>
          </div>
          <Identity
            prefix="Signed in as"
            name={studentName}
            href={`/student/${courseId}/profile`}
            exitHref="/join"
            exitLabel="Switch course"
          />
        </div>
      }
      subnav={
        <div className="lg:hidden">
          <NavTabs items={items} label="Course sections" />
        </div>
      }
      aside={
        <div className="sticky top-32 space-y-6">
          <NavList items={items} label="Course sections" />
          <div className="rounded-[1.5rem] bg-paper-200 p-5 text-[0.82rem] leading-relaxed text-ink-500">
            <p className="font-medium text-ink-900">Your notes are private</p>
            <p className="mt-1.5">
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
    { href: base, label: "Course home", icon: "dashboard" },
    {
      href: `${base}/lecture`,
      label: "Lectures",
      nested: true,
      icon: "courses",
    },
    { href: `${base}/readiness`, label: "Study readiness", icon: "readiness" },
    { href: `${base}/notes`, label: "Notes", icon: "notes" },
    /*
      Below here is reachable from the sidebar on desktop and the scrolling pill
      row on mobile. The floating bar takes only the first four so its targets
      stay large — a six-icon bar stops being glanceable and gets hard to hit.
    */
    {
      href: `${base}/assessments`,
      label: "Assessments",
      nested: true,
      icon: "assessments",
      secondary: true,
    },
    {
      href: `${base}/support`,
      label: "Support plan",
      icon: "support",
      secondary: true,
    },
    {
      href: `${base}/resources`,
      label: "Resources",
      icon: "resources",
      secondary: true,
    },
    {
      href: `${base}/profile`,
      label: "Profile",
      icon: "profile",
      secondary: true,
    },
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
      <header className="sticky top-0 z-30 bg-[color-mix(in_srgb,var(--page)_78%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-4 px-5 sm:px-7">
          <BrandLockup size="md" />
          <nav
            aria-label="Main"
            className="flex items-center gap-1 text-[0.9rem]"
          >
            <Link
              href="/about"
              className="hidden h-10 items-center rounded-full px-4 text-ink-500 no-underline transition-colors hover:bg-paper-200 hover:text-ink-900 sm:inline-flex"
            >
              About
            </Link>
            <Link
              href="/professor"
              className="inline-flex h-10 items-center rounded-full px-4 text-ink-500 no-underline transition-colors hover:bg-paper-200 hover:text-ink-900"
            >
              Teaching
            </Link>
            <Link
              href="/join"
              className="inline-flex h-10 items-center rounded-full bg-ink-900 px-5 font-medium text-white no-underline transition-colors hover:bg-ink-800"
            >
              Student portal
            </Link>
          </nav>
        </div>
      </header>
      <main
        id="main"
        className={`mx-auto w-full flex-1 px-5 py-12 sm:px-7 ${
          wide ? "max-w-6xl" : "max-w-3xl"
        }`}
      >
        {children}
      </main>
      <footer className="px-5 pb-10 pt-6 sm:px-7">
        <div className="mx-auto max-w-6xl text-[0.82rem] text-ink-400">
          <p>
            {product.name} · {product.strapline}
          </p>
        </div>
      </footer>
    </div>
  );
}
