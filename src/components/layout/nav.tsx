"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type NavItem = {
  href: string;
  label: string;
  /** Match nested routes as well as the exact path. */
  nested?: boolean;
  badge?: number;
};

function isActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true;
  return Boolean(item.nested) && pathname.startsWith(`${item.href}/`);
}

/** Horizontal tab-style navigation with an accessible current-page marker. */
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
    <nav aria-label={label} className={cn("min-w-0", className)}>
      <ul className="-mb-px flex flex-wrap gap-x-1 gap-y-0">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm no-underline transition-colors",
                  active
                    ? "border-burgundy-600 font-semibold text-burgundy-700"
                    : "border-transparent text-ink-500 hover:border-sand-300 hover:text-ink-800",
                )}
              >
                {item.label}
                {item.badge !== undefined && item.badge > 0 ? (
                  <span className="rounded-full bg-burgundy-50 px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums text-burgundy-700">
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

/** Vertical navigation used in the student sidebar. */
export function NavList({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm no-underline transition-colors",
                  active
                    ? "bg-burgundy-50 font-semibold text-burgundy-700"
                    : "text-ink-600 hover:bg-cream-200 hover:text-ink-900",
                )}
              >
                <span className="min-w-0">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 ? (
                  <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums text-burgundy-700">
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
