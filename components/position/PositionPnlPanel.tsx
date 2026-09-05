"use client";

import { formatDistanceToNow } from "date-fns";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { PnlText } from "@/components/ui/PnlText";
import { PnlComparisonChart } from "@/components/pnl/PnlComparisonChart";
import { formatCurrency } from "@/lib/format";
import type { PositionMetrics, Quote } from "@/lib/types";

export function PositionPnlPanel({ metrics, quote }: { metrics: PositionMetrics; quote?: Quote }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Realized vs. unrealized P&amp;L</CardTitle>
          <CardSubtitle>Locked-in gains so far, next to what&apos;s still on the table</CardSubtitle>
        </div>
      </CardHeader>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex flex-wrap items-end gap-8">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Realized</p>
            <PnlText
              value={metrics.realizedPnl}
              formatted={formatCurrency(metrics.realizedPnl, { signed: true })}
              className="font-serif text-3xl"
            />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Unrealized</p>
            {metrics.unrealizedPnl !== null ? (
              <PnlText
                value={metrics.unrealizedPnl}
                formatted={formatCurrency(metrics.unrealizedPnl, { signed: true })}
                className="text-base opacity-80"
              />
            ) : (
              <p className="text-sm text-fg-subtle">—</p>
            )}
            {quote?.price != null && (
              <p className="text-[11px] text-fg-subtle">
                {formatCurrency(quote.price)} current
                {quote.asOf && ` · as of ${formatDistanceToNow(new Date(quote.asOf), { addSuffix: true })}`}
              </p>
            )}
          </div>
        </div>

        <PnlComparisonChart realized={metrics.realizedPnl} unrealized={metrics.unrealizedPnl} />
      </div>
    </Card>
  );
}
