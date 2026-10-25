"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Band, LogRow } from "@/components/log/Band";
import { PnlText } from "@/components/ui/PnlText";
import { PnlComparisonChart } from "@/components/pnl/PnlComparisonChart";
import { usePositionStore } from "@/store/usePositionStore";
import { useQuotes } from "@/hooks/useQuotes";
import { computePnlSummary, computeSymbolPnlBreakdown } from "@/lib/portfolio";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import { latestFixToken } from "@/components/log/fix";

export function PortfolioPnlPanel() {
  const positions = usePositionStore((s) => s.positions);
  const [expanded, setExpanded] = useState(false);

  const openSymbols = useMemo(
    () => Array.from(new Set(positions.filter((p) => p.status === "open").map((p) => p.symbol))),
    [positions]
  );
  const { quotes } = useQuotes(openSymbols);
  const summary = useMemo(() => computePnlSummary(positions, quotes), [positions, quotes]);
  const breakdown = useMemo(() => computeSymbolPnlBreakdown(positions, quotes), [positions, quotes]);
  // Unrealized moves with the fix, so it re-stamps with it.
  const fixToken = latestFixToken(quotes);

  return (
    <Band title="Profit & loss" meta="Realized vs. still open">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,17rem)_1fr] lg:items-center">
        <dl>
          <div className="flex items-baseline gap-4 border-b border-rule pb-3">
            <dt className="stamp w-24 shrink-0 text-fg-subtle">Realized</dt>
            <dd>
              <PnlText
                value={summary.totalRealized}
                formatted={formatCurrency(summary.totalRealized, { signed: true })}
                className="figure text-3xl font-semibold"
              />
            </dd>
          </div>
          <div className="flex items-baseline gap-4 pt-3">
            <dt className="stamp w-24 shrink-0 text-fg-subtle">Unrealized</dt>
            <dd>
              <PnlText
                key={fixToken}
                value={summary.totalUnrealized}
                formatted={formatCurrency(summary.totalUnrealized, { signed: true })}
                className="figure animate-fix-stamp text-xl"
              />
              {summary.positionsWithoutPrice > 0 && (
                <p className="fix-stamp mt-1 text-[11px] text-fg-subtle">
                  {summary.positionsWithoutPrice} pending quote
                </p>
              )}
            </dd>
          </div>
        </dl>

        {/* With nothing traded yet the chart would draw an invented $0–$4
            scale, so it stays off the sheet until there is something to plot. */}
        {(summary.totalRealized !== 0 || summary.totalUnrealized !== 0) && (
          <PnlComparisonChart realized={summary.totalRealized} unrealized={summary.totalUnrealized} />
        )}
      </div>

      {breakdown.length > 0 && (
        <div className="mt-5 border-t border-rule pt-4">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="stamp flex items-center gap-1.5 text-fg-muted transition-colors hover:text-fg"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
            Breakdown by stock
          </button>

          {expanded && (
            <div className="mt-3">
              <div className="stamp hidden border-b border-rule pb-2 text-fg-subtle sm:grid sm:grid-cols-[1fr_9rem_9rem]">
                <span>Stock</span>
                <span className="text-right">Realized</span>
                <span className="text-right">Unrealized</span>
              </div>
              {breakdown.map((s) => (
                <LogRow key={s.symbol}>
                  <div className="grid grid-cols-2 items-baseline gap-2 sm:grid-cols-[1fr_9rem_9rem]">
                    <span className="stamp-lg text-fg">{s.symbol}</span>
                    <span className="text-right">
                      <span className="stamp mr-2 text-fg-subtle sm:hidden">Real.</span>
                      <PnlText
                        value={s.realizedPnl}
                        formatted={formatCurrency(s.realizedPnl, { signed: true })}
                        className="figure text-sm"
                      />
                    </span>
                    <span className="col-start-2 text-right sm:col-start-auto">
                      <span className="stamp mr-2 text-fg-subtle sm:hidden">Unreal.</span>
                      {s.unrealizedPnl !== null ? (
                        <PnlText
                          value={s.unrealizedPnl}
                          formatted={formatCurrency(s.unrealizedPnl, { signed: true })}
                          className="figure text-sm"
                        />
                      ) : (
                        <span className="figure text-sm text-fg-subtle">—</span>
                      )}
                    </span>
                  </div>
                </LogRow>
              ))}
            </div>
          )}
        </div>
      )}
    </Band>
  );
}
