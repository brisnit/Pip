"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutGrid,
  LifeBuoy,
  NotebookPen,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Icons are named, not passed.
 *
 * Navigation is defined in server components and rendered by this client one, and a
 * React component is a function — which cannot cross that boundary. Sending a string
 * and resolving it here keeps the nav definitions declarative and serialisable.
 */
const ICONS = {
  dashboard: LayoutGrid,
  courses: BookOpen,
  students: Users,
  profile: User,
  readiness: GraduationCap,
  notes: NotebookPen,
  assessments: ClipboardList,
  support: LifeBuoy,
  resources: FileText,
} as const;

export type NavIcon = keyof typeof ICONS;

export type NavItem = {
  href: string;
  label: string;
  /** Match nested routes as well as the exact path. */
  nested?: boolean;
  badge?: number;
  /** Shown in the floating bar, where there is no room for words. */
  icon?: NavIcon;
  /** Kept out of the mobile bar, which holds four items at most. */
  secondary?: boolean;
};

function isActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true;
  return Boolean(item.nested) && pathname.startsWith(`${item.href}/`);
}

/**
 * Pill navigation.
 *
 * The active item is a filled near-black pill rather than an underline — the same
 * treatment the filter tabs use, so "where I am" and "what I am filtering by" look
 * like one idea rather than two conventions.
 *
 * It scrolls horizontally rather than wrapping: a nav that reflows to two rows
 * changes the height of the page header as you move around it.
 */
export function NavTabs({
  items,
  label,
  className,
}: {
  items: NavItem[];
  label: string;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={label}
      className={cn(
        "no-scrollbar -mx-1 min-w-0 overflow-x-auto px-1",
        className,
      )}
    >
      <ul className="flex w-max gap-1.5">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.9rem] no-underline transition-colors duration-200",
                  active
                    ? "bg-ink-900 font-medium text-white"
                    : "text-ink-500 hover:bg-paper-200 hover:text-ink-900",
                )}
              >
                {item.label}
                {item.badge !== undefined && item.badge > 0 ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[0.7rem] font-medium tabular-nums",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-brand-50 text-brand-700",
                    )}
                  >
                    {item.badge}
                    <span className="sr-only"> items</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Vertical navigation for a sidebar. Same pill language, stacked. */
export function NavList({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="space-y-1">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon ? ICONS[item.icon] : null;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-full px-4 py-2.5 text-[0.92rem] no-underline transition-colors duration-200",
                  active
                    ? "bg-ink-900 font-medium text-white"
                    : "text-ink-600 hover:bg-white hover:text-ink-900",
                )}
              >
                {Icon ? (
                  <Icon
                    size={18}
                    strokeWidth={1.75}
                    className="shrink-0"
                    aria-hidden="true"
                  />
                ) : null}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[0.7rem] font-medium tabular-nums",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-brand-50 text-brand-700",
                    )}
                  >
                    {item.badge}
                    <span className="sr-only"> items</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The floating bar, on mobile.
 *
 * Detached from the bottom edge, translucent, with the active item in a near-black
 * circle. Icons only, so each label is carried by the accessible name instead —
 * `aria-current` and the label together are what a screen reader announces.
 *
 * Four items maximum. Anything else lives one level in; a floating bar with six
 * icons stops being glanceable and the targets get too small to hit.
 *
 * The shell pairs this with bottom padding on `main` so the bar never covers the
 * last element on the page.
 */
export function FloatingNav({
  items,
  label,
  className,
}: {
  items: NavItem[];
  label: string;
  className?: string;
}) {
  const pathname = usePathname();
  const visible = items
    .filter((item) => !item.secondary && item.icon)
    .slice(0, 4);
  if (visible.length === 0) return null;

  return (
    <nav
      aria-label={label}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden",
        className,
      )}
    >
      <ul className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-white/85 p-1.5 shadow-[var(--shadow-float)] backdrop-blur-xl">
        {visible.map((item) => {
          const active = isActive(pathname, item);
          const Icon = ICONS[item.icon!];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // 52px targets, comfortably past the 44px minimum.
                  "flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full no-underline transition-colors duration-200",
                  active
                    ? "bg-ink-900 text-white"
                    : "text-ink-500 hover:bg-paper-200 hover:text-ink-900",
                )}
              >
                <Icon size={21} strokeWidth={1.75} aria-hidden="true" />
                <span className="sr-only">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
