"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { LogPositionMenu } from "@/components/shell/LogPositionMenu";
import { DataMenu } from "@/components/shell/DataMenu";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/strategies", label: "Strategies" },
  { href: "/analysis", label: "Analysis" },
  { href: "/disclosures", label: "Disclosures" },
];

function useActive(pathname: string) {
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/**
 * The masthead: one ruled band carrying the sheet's name, its sections as log
 * tabs, and the controls. Replaces the two stacked bars this app used to open
 * with. Below `sm` the tabs drop to their own ruled row rather than colliding
 * with the controls.
 */
export function NavBar() {
  const pathname = usePathname();
  const isActive = useActive(pathname);

  const tabClass = (active: boolean) =>
    cn(
      "stamp whitespace-nowrap border-b-2 transition-colors",
      active ? "border-accent text-fg" : "border-transparent text-fg-subtle hover:text-fg"
    );

  return (
    <header className="sticky top-0 z-40 border-b border-rule-strong bg-bg">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
        <div className="flex h-12 items-center gap-3 sm:h-14 sm:gap-5">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-fg"
            aria-label="Stock Tracker — dashboard"
          >
            <span aria-hidden="true" className="h-5 w-[3px] bg-fg" />
            <span className="stamp-lg">Stock Tracker</span>
          </Link>

          <nav className="hidden min-w-0 items-center sm:flex" aria-label="Sections">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(tabClass(isActive(item.href)), "px-3 py-2")}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <ThemeToggle />
            <DataMenu />
            <LogPositionMenu />
          </div>
        </div>

        <nav className="flex border-t border-rule sm:hidden" aria-label="Sections">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(tabClass(isActive(item.href)), "flex-1 py-2.5 text-center")}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
