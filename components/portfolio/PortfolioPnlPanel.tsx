"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { PnlText } from "@/components/ui/PnlText";
import { PnlComparisonChart } from "@/components/pnl/PnlComparisonChart";
import { usePositionStore } from "@/store/usePositionStore";
import { useQuotes } from "@/hooks/useQuotes";
import { computePnlSummary } from "@/lib/portfolio";
import { formatCurrency } from "@/lib/format";

export function PortfolioPnlPanel() {
  const positions = usePositionStore((s) => s.positions);

  const openSymbols = useMemo(
    () => Array.from(new Set(positions.filter((p) => p.status === "open").map((p) => p.symbol))),
    [positions]
  );
  const { quotes } = useQuotes(openSymbols);
  const summary = useMemo(() => computePnlSummary(positions, quotes), [positions, quotes]);

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
    </Card>
  );
}
