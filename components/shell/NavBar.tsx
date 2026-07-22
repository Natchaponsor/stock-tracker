"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/strategies", label: "Strategies" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-serif text-lg font-medium text-fg shrink-0">
          <TrendingUp className="h-5 w-5 text-accent" strokeWidth={2} />
          <span className="hidden sm:inline">Stock Tracker</span>
        </Link>

        <nav className="flex items-center gap-1 shrink-0">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "bg-panel text-fg" : "text-fg-muted hover:text-fg"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Link href="/positions/new">
            <Button variant="primary" size="sm">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Log Position</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
