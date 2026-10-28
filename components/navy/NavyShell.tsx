"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartLine, FileText, LayoutDashboard, ListChecks, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { LogPositionMenu } from "@/components/shell/LogPositionMenu";
import { DataMenu } from "@/components/shell/DataMenu";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Footer } from "@/components/shell/Footer";
import { useRefreshPrices } from "@/hooks/useRefreshPrices";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/strategies", label: "Strategies", icon: ListChecks },
  { href: "/analysis", label: "Analysis", icon: ChartLine },
  { href: "/disclosures", label: "Disclosures", icon: FileText },
];

/**
 * The app frame for every page. Wide screens keep the previous layout's single
 * top menu (name, sections, controls); phones move the sections into Navy
 * Stream's bottom tab bar, with Log position as the raised add button.
 */
export function NavyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const { refresh, refreshing } = useRefreshPrices();

  return (
    <div className="flex min-h-screen flex-col bg-ns-page text-ns-ink">
      <header className="sticky top-0 z-40 border-b border-ns-line bg-ns-card">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-4 px-4 md:h-16 md:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Stock Tracker — dashboard">
            <span aria-hidden="true" className="oc-silk h-7 w-7 rounded-ns-sm" />
            <span className="ns-heading text-ns-ink">Stock Tracker</span>
          </Link>

          <nav className="hidden min-w-0 items-center gap-1 md:flex" aria-label="Sections">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "ns-label whitespace-nowrap rounded-full px-3.5 py-2 transition-colors",
                    active
                      ? "bg-ns-primary-soft text-ns-primary-text"
                      : "text-ns-ink-muted hover:text-ns-ink"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* The dashboard header carries its own refresh beside the price time. */}
            {pathname !== "/" && (
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing}
                title="Fetch current prices now. Nothing refreshes automatically."
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-ns-sunken text-ns-ink-muted transition-colors hover:text-ns-ink disabled:opacity-60"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                <span className="sr-only">{refreshing ? "Refreshing prices" : "Refresh prices"}</span>
              </button>
            )}
            <ThemeToggle />
            <DataMenu />
            <LogPositionMenu variant="pill" className="hidden md:block" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-4 pb-10 md:px-6 md:pt-6">{children}</main>

      {/* Room under the footer so the floating tab bar never covers it. */}
      <div className="pb-28 md:pb-0">
        <Footer />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
        {/* A slightly narrower add-button column and side padding than the
            stock tab bar, so "Disclosures" fits whole on a 360px phone. */}
        <nav className="oc-tabbar mx-auto max-w-[480px] grid-cols-[1fr_1fr_64px_1fr_1fr]! px-1!" aria-label="Sections">
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <TabLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
          {/* The middle column holds the raised add button. Stretching it to
              the bar's full height lets the button sit half above the bar. */}
          <LogPositionMenu variant="fab" className="-mt-3 self-stretch" />
          {NAV_ITEMS.slice(2).map((item) => (
            <TabLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>
      </div>
    </div>
  );
}

function TabLink({ item, active }: { item: (typeof NAV_ITEMS)[number]; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className="oc-tab min-w-0">
      <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  );
}
