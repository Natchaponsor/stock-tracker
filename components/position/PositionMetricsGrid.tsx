"use client";

import { Card } from "@/components/ui/Card";
import { PnlText } from "@/components/ui/PnlText";
import { readSignal } from "@/lib/signal";
import { formatCurrency, formatPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { PositionMetrics } from "@/lib/types";
import type { TrendState } from "@/lib/indicators";

interface Props {
  metrics: PositionMetrics;
  trend: TrendState;
  hasEnoughData: boolean;
}

export function PositionMetricsGrid({ metrics, trend, hasEnoughData }: Props) {
  const signal = readSignal(trend, hasEnoughData);

  return (
    <Card>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Avg entry</p>
          <p className="text-sm font-semibold tabular-nums text-fg">{formatCurrency(metrics.avgEntryPrice)}</p>
          <p className="text-[11px] text-fg-subtle">{metrics.totalQtyEntered} sh total</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Open qty</p>
          <p className="text-sm font-semibold tabular-nums text-fg">{metrics.openQty} sh</p>
          <p className="text-[11px] text-fg-subtle">{formatCurrency(metrics.costBasis)} basis</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Realized</p>
          <PnlText value={metrics.realizedPnl} formatted={formatCurrency(metrics.realizedPnl, { signed: true })} />
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Unrealized</p>
          {metrics.unrealizedPnl !== null ? (
            <PnlText value={metrics.unrealizedPnl} formatted={formatCurrency(metrics.unrealizedPnl, { signed: true })} className="font-serif text-base" />
          ) : (
            <p className="text-sm text-fg-subtle">—</p>
          )}
          {metrics.returnPct !== null && (
            <p className={cn("text-[11px] tabular-nums", metrics.returnPct >= 0 ? "text-gain" : "text-loss")}>
              {formatPct(metrics.returnPct, { signed: true })}
            </p>
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
            {signal.label}
          </p>
        </div>
      </div>
    </Card>
  );
}
