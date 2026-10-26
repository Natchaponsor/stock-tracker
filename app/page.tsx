"use client";

import { useHydrated } from "@/hooks/useHydrated";
import { Skeleton } from "@/components/ui/Skeleton";
import { Band } from "@/components/log/Band";
import { RecordedLog } from "@/components/log/RecordedLog";
import { WatchlistStrip } from "@/components/watchlist/WatchlistStrip";
import { StrategyPerformanceCard } from "@/components/strategy/StrategyPerformanceCard";
import { PortfolioOverview } from "@/components/portfolio/PortfolioOverview";
import { PortfolioPnlPanel } from "@/components/portfolio/PortfolioPnlPanel";

/** Mirrors the ruled-band shape the sheet loads into, so nothing jumps. */
function BandSkeleton({ rows = 2, lead = false }: { rows?: number; lead?: boolean }) {
  return (
    <div className={lead ? "" : "border-t border-rule-strong"}>
      <div className="grid gap-x-6 gap-y-3 py-7 lg:grid-cols-[var(--axis)_1fr]">
        <div className="lg:pr-6">
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="lg:border-l lg:border-rule lg:pl-6">
          {lead ? (
            <>
              <Skeleton className="h-14 w-64" />
              <Skeleton className="mt-6 h-4 w-full max-w-md" />
              <Skeleton className="mt-3 h-4 w-full max-w-sm" />
            </>
          ) : (
            Array.from({ length: rows }).map((_, i) => (
              <Skeleton key={i} className="mb-3 h-6 w-full last:mb-0" />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <BandSkeleton lead />
      <BandSkeleton rows={2} />
      <BandSkeleton rows={3} />
      <BandSkeleton rows={3} />
      <BandSkeleton rows={2} />
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

      <PortfolioPnlPanel />

      <Band title="Watchlist" meta="Tracked, not held">
        <WatchlistStrip />
      </Band>

      <RecordedLog />

      <StrategyPerformanceCard />
    </div>
  );
}
