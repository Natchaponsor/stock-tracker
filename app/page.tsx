"use client";

import { useMemo } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { usePositionStore } from "@/store/usePositionStore";
import { Skeleton } from "@/components/ui/Skeleton";
import { Band, EmptyEntry } from "@/components/log/Band";
import { WatchlistStrip } from "@/components/watchlist/WatchlistStrip";
import { PositionCard } from "@/components/position/PositionCard";
import { StrategyPerformanceCard } from "@/components/strategy/StrategyPerformanceCard";
import { PortfolioOverview } from "@/components/portfolio/PortfolioOverview";
import { PortfolioPnlPanel } from "@/components/portfolio/PortfolioPnlPanel";
import { AllocationChart } from "@/components/portfolio/AllocationChart";

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
  const positions = usePositionStore((s) => s.positions);

  const openPositions = useMemo(() => positions.filter((p) => p.status === "open"), [positions]);

  if (!hydrated) return <DashboardSkeleton />;

  return (
    <div>
      <h1 className="sr-only">Dashboard</h1>

      <PortfolioOverview />

      <PortfolioPnlPanel />

      <AllocationChart />

      <Band title="Watchlist" meta="Tracked, not held">
        <WatchlistStrip />
      </Band>

      <Band
        title="Outstanding Shares"
        meta={`${openPositions.length} open`}
      >
        {openPositions.length === 0 ? (
          <EmptyEntry
            title="No outstanding shares"
            description="Log a buy and it takes its place on the sheet here, with its thesis and check-in notes."
          />
        ) : (
          <div>
            <div className="stamp hidden border-b border-rule pb-2 text-fg-subtle sm:grid sm:grid-cols-[minmax(0,1fr)_7.5rem_8.5rem_8.5rem_5rem]">
              <span>Stock</span>
              <span>Avg entry</span>
              <span>Last fix</span>
              <span>Unrealized</span>
              <span>Held</span>
            </div>
            {openPositions.map((p) => (
              <PositionCard key={p.id} position={p} />
            ))}
          </div>
        )}
      </Band>

      <StrategyPerformanceCard />
    </div>
  );
}
