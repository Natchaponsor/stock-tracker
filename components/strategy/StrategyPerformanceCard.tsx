"use client";

import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePositionStore } from "@/store/usePositionStore";
import { computeStrategyStats } from "@/lib/strategyStats";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/cn";

export function StrategyPerformanceCard() {
  const strategies = usePositionStore((s) => s.strategies);
  const positions = usePositionStore((s) => s.positions);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Strategy performance</CardTitle>
          <CardSubtitle>How each rule set is actually doing</CardSubtitle>
        </div>
      </CardHeader>
      {strategies.length === 0 ? (
        <EmptyState title="No strategies defined yet" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {strategies.map((strategy) => {
            const stats = computeStrategyStats(strategy.id, positions);
            return (
              <div key={strategy.id} className="rounded-xl border border-border bg-panel p-4">
                <p className="font-serif text-sm font-medium text-fg">{strategy.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-fg-subtle line-clamp-2">{strategy.entryRule}</p>
                <div className="mt-3 flex gap-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-fg-subtle">Positions</p>
                    <p className="text-sm font-semibold text-fg">{stats.totalCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-fg-subtle">Win rate</p>
                    <p className="text-sm font-semibold text-fg">
                      {stats.winRate !== null ? `${Math.round(stats.winRate * 100)}%` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-fg-subtle">Avg return</p>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        stats.avgReturnPct === null
                          ? "text-fg-subtle"
                          : stats.avgReturnPct >= 0
                            ? "text-gain"
                            : "text-loss"
                      )}
                    >
                      {stats.avgReturnPct !== null ? formatPct(stats.avgReturnPct, { signed: true }) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
