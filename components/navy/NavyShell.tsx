"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, ChartLine, Eye, EyeOff, FileText, LayoutDashboard, ListChecks, RefreshCw, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import { LogPositionMenu } from "@/components/shell/LogPositionMenu";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Footer } from "@/components/shell/Footer";
import { useRefreshPrices } from "@/hooks/useRefreshPrices";
import { usePriceAge } from "@/hooks/usePriceAge";
import { usePositionStore } from "@/store/usePositionStore";
import { useNow } from "@/components/log/clock";
import { usePlatform } from "@/hooks/usePlatform";
import { FxAlertWatcher } from "@/components/fx/FxAlertWatcher";
import { useBackupStatus } from "@/hooks/useBackupStatus";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/strategies", label: "Strategies", icon: ListChecks },
  { href: "/analysis", label: "Analysis", icon: ChartLine },
  { href: "/fx", label: "FX", icon: ArrowLeftRight },
  { href: "/disclosures", label: "Disclosures", icon: FileText },
];

/** The phone tab bar has room for four tabs; FX lives inside Analysis there. */
const TAB_ITEMS = NAV_ITEMS.filter((item) => item.href !== "/fx");

const ROUND_BTN =
  "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ns-card text-ns-ink-muted shadow-ns-card transition-colors hover:text-ns-ink disabled:opacity-60";

/**
 * The app frame for every page, following Navy Stream's two platform sets.
 * Web (768px and up): the Sidebar on the left (icons only below 1024px) and a
 * top bar over the page with the controls. Phones: a slim header and the
 * bottom tab bar, with Log position as the raised add button. Breakpoints
 * match the ones built into bundle.css's oc-app / oc-sidebar rules.
 *
 * Only the matching set is rendered once the width is known (usePlatform);
 * before that both are in the page and CSS shows the right one.
 */
export function NavyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const platform = usePlatform();
  const showWeb = platform !== "phone";
  const showPhone = platform !== "web";
  const backupDue = useBackupStatus().due;
  const settingsLabel = backupDue ? "Settings (backup due)" : "Settings";

  return (
    <div className="oc-app bg-ns-page text-ns-ink">
      <FxAlertWatcher />
      {showWeb && (
        <aside className="oc-sidebar sticky top-0 h-screen self-start">
          <Link href="/" className="oc-brand text-ns-ink no-underline" aria-label="Stock Tracker — dashboard">
            {/* A div, not a span: bundle.css hides spans in .oc-brand when the sidebar collapses. */}
            <div aria-hidden="true" className="oc-brand-mark oc-silk" />
            <span>Stock Tracker</span>
          </Link>
          <nav className="flex w-full flex-col gap-1.5" aria-label="Sections">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  // The label span hides when the sidebar collapses to icons, so the
                  // link keeps its name here and shows it as a tooltip.
                  aria-label={item.label}
                  title={item.label}
                  className="oc-nav"
                >
                  <Icon strokeWidth={1.8} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <Link
            href="/settings"
            aria-current={isActive("/settings") ? "page" : undefined}
            aria-label={settingsLabel}
            title={settingsLabel}
            className="oc-nav mt-auto w-full"
          >
            <Settings strokeWidth={1.8} aria-hidden="true" />
            <span>Settings</span>
            {/* A div: bundle.css hides spans in .oc-nav when the sidebar collapses. */}
            {backupDue && <div aria-hidden="true" className="ml-auto h-2 w-2 shrink-0 rounded-full bg-ns-warning" />}
          </Link>
        </aside>
      )}

      <div className="flex min-w-0 flex-col">
        {showPhone && (
          <header className="sticky top-0 z-40 border-b border-ns-line bg-ns-card pt-[env(safe-area-inset-top)] md:hidden">
            <div className="flex h-14 items-center gap-3 px-4">
              <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Stock Tracker — dashboard">
                <span aria-hidden="true" className="oc-silk h-7 w-7 rounded-ns-sm" />
                <span className="ns-heading text-ns-ink">Stock Tracker</span>
              </Link>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <ThemeToggle />
                <Link
                  href="/settings"
                  aria-current={isActive("/settings") ? "page" : undefined}
                  aria-label={settingsLabel}
                  title={settingsLabel}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full bg-ns-sunken text-ns-ink-muted transition-colors hover:text-ns-ink aria-[current=page]:bg-ns-primary-soft aria-[current=page]:text-ns-primary-text"
                >
                  <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                  {backupDue && (
                    <span aria-hidden="true" className="absolute top-1 right-1 h-2 w-2 rounded-full bg-ns-warning" />
                  )}
                </Link>
              </div>
            </div>
          </header>
        )}

        <main className="oc-page mx-auto flex-1">
          {showWeb && <TopBar isDashboard={pathname === "/"} />}
          {children}
        </main>

        {/* Room under the footer so the floating tab bar never covers it. */}
        <div className="pb-28 md:pb-0">
          <Footer />
        </div>
      </div>

      {showPhone && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
          {/* A slightly narrower add-button column and side padding than the
              stock tab bar, so "Disclosures" fits whole on a 360px phone. */}
          <nav className="oc-tabbar mx-auto max-w-[480px] grid-cols-[1fr_1fr_64px_1fr_1fr]! px-1!" aria-label="Sections">
            {TAB_ITEMS.slice(0, 2).map((item) => (
              <TabLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
            {/* The middle column holds the raised add button. Stretching it to
                the bar's full height lets the button sit half above the bar. */}
            <LogPositionMenu variant="fab" className="-mt-3 self-stretch" />
            {TAB_ITEMS.slice(2).map((item) => (
              <TabLink
                key={item.href}
                item={item}
                active={isActive(item.href) || (item.href === "/analysis" && isActive("/fx"))}
              />
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * The web top bar (Navy Stream oc-topbar). On the dashboard it opens with a
 * greeting and today's date; elsewhere the page brings its own title, so the
 * left side just says how old the prices are. Controls sit on the right.
 */
function TopBar({ isDashboard }: { isDashboard: boolean }) {
  const now = useNow();
  const priceAge = usePriceAge();
  const hidePnl = usePositionStore((s) => s.hidePnl);
  const toggleHidePnl = usePositionStore((s) => s.toggleHidePnl);
  const { refresh, refreshing } = useRefreshPrices();
  const today = now === null ? null : new Date(now);

  return (
    <div className="oc-topbar hidden! md:flex!">
      <div className="min-w-0">
        {isDashboard ? (
          <>
            {/* The greeting needs the clock, which only exists after mount. */}
            <p className="ns-title text-ns-ink">{today ? greeting(today.getHours()) : "Dashboard"}</p>
            <p className="mt-1 truncate text-[14px] leading-5 text-ns-ink-muted" title={priceAge.title}>
              {today && `${today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} · `}
              {priceAge.text}
            </p>
          </>
        ) : (
          <p className="ns-label truncate font-normal text-ns-ink-muted" title={priceAge.title}>
            {priceAge.text}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={toggleHidePnl}
          aria-pressed={hidePnl}
          title={hidePnl ? "Show amounts" : "Hide amounts (privacy mode)"}
          className={ROUND_BTN}
        >
          {hidePnl ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          <span className="sr-only">{hidePnl ? "Show amounts" : "Hide amounts"}</span>
        </button>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          title="Fetch current prices now. Nothing refreshes automatically."
          className={ROUND_BTN}
        >
          <RefreshCw className={cn("h-[18px] w-[18px]", refreshing && "animate-spin")} />
          <span className="sr-only">{refreshing ? "Refreshing prices" : "Refresh prices"}</span>
        </button>
        <ThemeToggle onPage />
        <LogPositionMenu variant="pill" />
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
