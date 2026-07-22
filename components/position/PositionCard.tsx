"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PnlText } from "@/components/ui/PnlText";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuotes } from "@/hooks/useQuotes";
import { useHistory } from "@/hooks/useHistory";
import { usePositionStore } from "@/store/usePositionStore";
import { computePositionMetrics } from "@/lib/positionMetrics";
import { readSignal } from "@/lib/signal";
import { formatCurrency, formatPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Position } from "@/lib/types";

export function PositionCard({ position }: { position: Position }) {
  const { quotes, isLoading } = useQuotes([position.symbol]);
  const quote = quotes.get(position.symbol);
  const { trend, hasEnoughData } = useHistory(position.symbol);
  const strategies = usePositionStore((s) => s.strategies);
  const strategy = strategies.find((s) => s.id === position.strategyId);

  const metrics = useMemo(
    () => computePositionMetrics(position, quote?.price ?? null),
    [position, quote]
  );
  const signal = readSignal(trend, hasEnoughData);

  return (
    <Link href={`/positions/${position.id}`}>
      <Card className="hover:border-fg-subtle/50 transition-colors duration-150">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-serif text-lg font-medium text-fg">{position.symbol}</span>
            {strategy && (
              <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-fg-subtle">
                {strategy.name}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Avg entry</p>
            <p className="text-sm font-semibold tabular-nums text-fg">{formatCurrency(metrics.avgEntryPrice)}</p>
            <p className="text-[11px] text-fg-subtle">{metrics.openQty} sh</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Current</p>
            {isLoading && !quote ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <p className="text-sm font-semibold tabular-nums text-fg">
                {quote?.price !== null && quote?.price !== undefined ? formatCurrency(quote.price) : "—"}
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Unrealized</p>
            {metrics.unrealizedPnl !== null ? (
              <>
                <PnlText
                  value={metrics.unrealizedPnl}
                  formatted={formatCurrency(metrics.unrealizedPnl, { signed: true })}
                  className="text-base font-serif"
                />
                <p className={cn("text-[11px] tabular-nums", metrics.returnPct !== null && metrics.returnPct >= 0 ? "text-gain" : "text-loss")}>
                  {metrics.returnPct !== null ? formatPct(metrics.returnPct, { signed: true }) : "—"}
                </p>
              </>
            ) : (
              <p className="text-sm text-fg-subtle">—</p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Held</p>
            <p className="text-sm font-semibold text-fg">{metrics.daysHeld} days</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Signal</p>
            <p
              className={cn(
                "text-sm font-medium",
                signal.tone === "good" && "text-gain",
                signal.tone === "bad" && "text-loss",
                signal.tone === "neutral" && "text-fg-muted"
              )}
            >
              {signal.tone === "good" ? "Bullish" : signal.tone === "bad" ? "Bearish" : "Neutral"}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
