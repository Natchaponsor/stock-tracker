"use client";

import { Band, LogRow, EmptyEntry } from "@/components/log/Band";
import { usePositionStore } from "@/store/usePositionStore";
import { computeStrategyStats } from "@/lib/strategyStats";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/cn";

export function StrategyPerformanceCard() {
  const strategies = usePositionStore((s) => s.strategies);
  const positions = usePositionStore((s) => s.positions);

  return (
    <Band title="Strategy record" meta="Per rule set">
      {strategies.length === 0 ? (
        <EmptyEntry
          title="No rule sets defined"
          description="Name a strategy and tag positions with it to start building a record."
        />
      ) : (
        <div>
          <div className="stamp hidden border-b border-rule pb-2 text-fg-subtle sm:grid sm:grid-cols-[minmax(0,1fr)_6rem_6rem_7rem]">
            <span>Rule set</span>
            <span className="text-right">Positions</span>
            <span className="text-right">Win rate</span>
            <span className="text-right">Avg return</span>
          </div>

          {strategies.map((strategy) => {
            const stats = computeStrategyStats(strategy.id, positions);
            return (
              <LogRow key={strategy.id}>
                <div className="grid grid-cols-3 items-baseline gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_7rem]">
                  <div className="col-span-3 min-w-0 sm:col-span-1">
                    <p className="stamp-lg text-fg">{strategy.name}</p>
                    <p className="mt-1 line-clamp-2 max-w-prose text-xs leading-relaxed text-fg-subtle">
                      {strategy.entryRule}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="stamp text-fg-subtle sm:hidden">Positions</p>
                    <p className="figure text-sm text-fg">{stats.totalCount}</p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="stamp text-fg-subtle sm:hidden">Win rate</p>
                    <p className="figure text-sm text-fg">
                      {stats.winRate !== null ? `${Math.round(stats.winRate * 100)}%` : "—"}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="stamp text-fg-subtle sm:hidden">Avg return</p>
                    <p
                      className={cn(
                        "figure text-sm",
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
              </LogRow>
            );
          })}
        </div>
      )}
    </Band>
  );
}
