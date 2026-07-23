"use client";

import { useMemo } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { usePositionStore } from "@/store/usePositionStore";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { WatchlistStrip } from "@/components/watchlist/WatchlistStrip";
import { PositionCard } from "@/components/position/PositionCard";
import { ClosedPositionsTable } from "@/components/position/ClosedPositionsTable";
import { StrategyPerformanceCard } from "@/components/strategy/StrategyPerformanceCard";
import { PortfolioOverview } from "@/components/portfolio/PortfolioOverview";
import { AllocationChart } from "@/components/portfolio/AllocationChart";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-28" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
    </div>
  );
}

export default function DashboardPage() {
  const hydrated = useHydrated();
  const positions = usePositionStore((s) => s.positions);

  const openPositions = useMemo(() => positions.filter((p) => p.status === "open"), [positions]);
  const closedPositions = useMemo(
    () =>
      [...positions.filter((p) => p.status === "closed")].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [positions]
  );

  if (!hydrated) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-medium text-fg">Dashboard</h1>

      <PortfolioOverview />

      <AllocationChart />

      <section className="space-y-3">
        <div>
          <h2 className="font-serif text-lg font-medium text-fg">Watchlist</h2>
          <p className="text-sm text-fg-muted">Signal state for the symbols you&apos;re tracking</p>
        </div>
        <WatchlistStrip />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-serif text-lg font-medium text-fg">Open positions</h2>
          <p className="text-sm text-fg-muted">{openPositions.length} open</p>
        </div>
        {openPositions.length === 0 ? (
          <Card>
            <EmptyState title="No open positions" description="Log a position to start tracking it here." />
          </Card>
        ) : (
          <div className="space-y-3">
            {openPositions.map((p) => (
              <PositionCard key={p.id} position={p} />
            ))}
          </div>
        )}
      </section>

      <ClosedPositionsTable positions={closedPositions} />

      <StrategyPerformanceCard />
    </div>
  );
}
