"use client";

import { NsCard, NsChangeBadge, NsEmpty } from "@/components/navy/primitives";
import { usePositionStore } from "@/store/usePositionStore";
import { computeStrategyStats } from "@/lib/strategyStats";
import { formatPct } from "@/lib/format";

export function StrategyPerformanceCard({
  className,
  defaultOpen = false,
}: {
  className?: string;
  defaultOpen?: boolean;
}) {
  const strategies = usePositionStore((s) => s.strategies);
  const positions = usePositionStore((s) => s.positions);

  return (
    <NsCard title="Strategy record" meta="Per rule set" className={className} collapsible defaultOpen={defaultOpen}>
      {strategies.length === 0 ? (
        <NsEmpty
          title="No rule sets defined"
          description="Name a strategy and tag positions with it to start building a record."
        />
      ) : (
        <ul className="divide-y divide-ns-line">
          {strategies.map((strategy) => {
            const stats = computeStrategyStats(strategy.id, positions);
            const winPct = stats.winRate !== null ? Math.round(stats.winRate * 100) : null;
            return (
              <li key={strategy.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="ns-body font-semibold text-ns-ink">{strategy.name}</p>
                    <p className="ns-caption mt-0.5 line-clamp-2 max-w-prose font-normal text-ns-ink-muted">
                      {strategy.entryRule}
                    </p>
                  </div>
                  {stats.avgReturnPct !== null ? (
                    <NsChangeBadge value={stats.avgReturnPct}>
                      {formatPct(stats.avgReturnPct, { signed: true })} avg
                    </NsChangeBadge>
                  ) : (
                    <span className="oc-badge bg-ns-sunken text-ns-ink-muted">No closes</span>
                  )}
                </div>

                <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
                  <div className="oc-track h-1.5!" aria-hidden="true">
                    <div className="oc-fill bg-ns-primary" style={{ width: `${winPct ?? 0}%` }} />
                  </div>
                  <p className="ns-caption oc-num font-normal text-ns-ink-muted">
                    {winPct !== null ? `${winPct}% win rate` : "No win rate yet"} · {stats.totalCount}{" "}
                    {stats.totalCount === 1 ? "position" : "positions"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </NsCard>
  );
}
