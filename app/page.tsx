"use client";

import { useHydrated } from "@/hooks/useHydrated";
import { NsCard, NsSkeleton } from "@/components/navy/primitives";
import { RecordedLog } from "@/components/log/RecordedLog";
import { WatchlistStrip } from "@/components/watchlist/WatchlistStrip";
import { StrategyPerformanceCard } from "@/components/strategy/StrategyPerformanceCard";
import { PortfolioOverview } from "@/components/portfolio/PortfolioOverview";
import { PortfolioPnlPanel } from "@/components/portfolio/PortfolioPnlPanel";
import { AllocationChart } from "@/components/portfolio/AllocationChart";

/**
 * The cards rise straight out of the silk header: the first row overlaps its
 * bottom edge, so the cards' own rounded corners are the curve and no strip
 * of page shows between the header and the first card.
 */
function Sheet({ children }: { children: React.ReactNode }) {
  return <div className="relative -mt-7 grid items-start gap-3 lg:grid-cols-2 lg:gap-4">{children}</div>;
}

/** Mirrors the header-and-cards shape the dashboard loads into, so nothing jumps. */
function DashboardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="oc-silk rounded-ns-xl px-5 pt-5 pb-14 md:px-8">
        <div className="mx-auto mt-12 h-12 w-56 animate-pulse rounded-ns-sm bg-ns-glass" />
        <div className="oc-glass mx-auto mt-8 h-[76px] max-w-2xl" />
      </div>
      <Sheet>
        {[3, 4, 3, 2].map((rows, i) => (
          <div key={i} className="oc-card">
            <NsSkeleton className="h-5 w-36" />
            {Array.from({ length: rows }).map((_, j) => (
              <NsSkeleton key={j} className="mt-4 h-8 w-full" />
            ))}
          </div>
        ))}
      </Sheet>
    </div>
  );
}

export default function DashboardPage() {
  const hydrated = useHydrated();

  if (!hydrated) return <DashboardSkeleton />;

  return (
    <div>
      <h1 className="sr-only">Dashboard</h1>

      <PortfolioOverview />

      <Sheet>
        <PortfolioPnlPanel />
        <AllocationChart />

        <NsCard title="Watchlist" meta="Tracked, not held" className="lg:col-span-2">
          <WatchlistStrip />
        </NsCard>

        <RecordedLog className="lg:col-span-2" defaultOpen />
        <StrategyPerformanceCard className="lg:col-span-2" defaultOpen={false} />
      </Sheet>
    </div>
  );
}
