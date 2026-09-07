"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { PnlText } from "@/components/ui/PnlText";
import { PnlComparisonChart } from "@/components/pnl/PnlComparisonChart";
import { usePositionStore } from "@/store/usePositionStore";
import { useQuotes } from "@/hooks/useQuotes";
import { computePnlSummary, computeSymbolPnlBreakdown } from "@/lib/portfolio";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";

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

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Portfolio P&amp;L</CardTitle>
          <CardSubtitle>Realized across every position, vs. what&apos;s still open</CardSubtitle>
        </div>
      </CardHeader>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex flex-wrap items-end gap-8">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Realized</p>
            <PnlText
              value={summary.totalRealized}
              formatted={formatCurrency(summary.totalRealized, { signed: true })}
              className="font-serif text-3xl"
            />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Unrealized</p>
            <PnlText
              value={summary.totalUnrealized}
              formatted={formatCurrency(summary.totalUnrealized, { signed: true })}
              className="text-base opacity-80"
            />
            {summary.positionsWithoutPrice > 0 && (
              <p className="text-[11px] text-fg-subtle">{summary.positionsWithoutPrice} pending quote</p>
            )}
          </div>
        </div>

        <PnlComparisonChart realized={summary.totalRealized} unrealized={summary.totalUnrealized} />
      </div>

      {breakdown.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex items-center gap-1.5 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
            Breakdown by stock
          </button>

          {expanded && (
            <ul className="mt-3 divide-y divide-border">
              {breakdown.map((s) => (
                <li key={s.symbol} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span className="font-medium text-fg">{s.symbol}</span>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-fg-subtle">Realized</p>
                      <PnlText
                        value={s.realizedPnl}
                        formatted={formatCurrency(s.realizedPnl, { signed: true })}
                        className="text-sm"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-fg-subtle">Unrealized</p>
                      {s.unrealizedPnl !== null ? (
                        <PnlText
                          value={s.unrealizedPnl}
                          formatted={formatCurrency(s.unrealizedPnl, { signed: true })}
                          className="text-sm opacity-80"
                        />
                      ) : (
                        <span className="text-sm text-fg-subtle">—</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
