"use client";

import { useHydrated } from "@/hooks/useHydrated";
import { usePlatform } from "@/hooks/usePlatform";
import { NsCard, NsSkeleton } from "@/components/navy/primitives";
import { RecordedLog } from "@/components/log/RecordedLog";
import { WatchlistStrip } from "@/components/watchlist/WatchlistStrip";
import { StrategyPerformanceCard } from "@/components/strategy/StrategyPerformanceCard";
import { PortfolioOverview } from "@/components/portfolio/PortfolioOverview";
import { SummaryBanner } from "@/components/portfolio/SummaryBanner";
import { AlertCallout } from "@/components/portfolio/AlertCallout";
import { PortfolioPnlPanel } from "@/components/portfolio/PortfolioPnlPanel";
import { AllocationChart } from "@/components/portfolio/AllocationChart";

/**
 * The cards under the header. On phones they rise out of the silk header (the
 * first card overlaps its bottom edge, so its corners are the curve). On the
 * web they sit 28px under the summary banner with 24px gaps, and from 1024px
 * the first row splits about 1.7 to 1: P&L on the left, the call-out and
 * allocation on the right.
 */
function Cards({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative -mt-7 grid items-start gap-3 md:mt-7 md:gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      {children}
    </div>
  );
}

/** Mirrors the header-and-cards shape the dashboard loads into, so nothing jumps. */
function DashboardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="oc-silk rounded-ns-xl px-5 pt-5 pb-14 md:hidden">
        <div className="mx-auto mt-12 h-12 w-56 animate-pulse rounded-ns-sm bg-ns-glass" />
        <div className="oc-glass mx-auto mt-8 h-[76px] max-w-2xl" />
      </div>
      <div className="oc-silk oc-banner hidden! md:grid!">
        <div className="h-24 animate-pulse rounded-ns-sm bg-ns-glass" />
        <div className="oc-glass h-[100px]" />
      </div>
      <Cards>
        {[4, 3, 3, 2].map((rows, i) => (
          <div key={i} className="oc-card md:p-6!">
            <NsSkeleton className="h-5 w-36" />
            {Array.from({ length: rows }).map((_, j) => (
              <NsSkeleton key={j} className="mt-4 h-8 w-full" />
            ))}
          </div>
        ))}
      </Cards>
    </div>
  );
}

export default function DashboardPage() {
  const hydrated = useHydrated();
  const platform = usePlatform();

  if (!hydrated) return <DashboardSkeleton />;

  return (
    <div>
      <h1 className="sr-only">Dashboard</h1>

      {/* One header per platform: the phone's silk header, the web's summary banner.
          Only the matching one renders once the width is known. */}
      {platform !== "web" && (
        <div className="md:hidden">
          <PortfolioOverview />
        </div>
      )}
      {platform !== "phone" && <SummaryBanner className="hidden! md:grid!" />}

      <Cards>
        <PortfolioPnlPanel />
        <div className="flex min-w-0 flex-col gap-3 md:gap-6">
          <AlertCallout />
          <AllocationChart />
        </div>

        <NsCard title="Watchlist" meta="Tracked, not held" className="lg:col-span-2">
          <WatchlistStrip />
        </NsCard>

        <RecordedLog className="lg:col-span-2" defaultOpen />
        <StrategyPerformanceCard className="lg:col-span-2" defaultOpen={false} />
      </Cards>
    </div>
  );
}
