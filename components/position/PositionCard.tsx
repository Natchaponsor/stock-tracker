"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { PnlText } from "@/components/ui/PnlText";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuotes } from "@/hooks/useQuotes";
import { usePositionStore } from "@/store/usePositionStore";
import { computePositionMetrics } from "@/lib/positionMetrics";
import { formatCurrency, formatPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Position } from "@/lib/types";

/** One held position, as an entry in the log's main ruled table. */
export function PositionCard({ position }: { position: Position }) {
  const { quotes, isLoading } = useQuotes([position.symbol]);
  const quote = quotes.get(position.symbol);
  const strategies = usePositionStore((s) => s.strategies);
  const tags = [
    ...position.strategyIds.map((id) => strategies.find((s) => s.id === id)?.name).filter((n): n is string => Boolean(n)),
    ...position.customTags,
  ];

  const metrics = useMemo(
    () => computePositionMetrics(position, quote?.price ?? null),
    [position, quote]
  );

  return (
    <Link
      href={`/positions/${position.id}`}
      className="group block border-b border-rule py-4 transition-colors last:border-b-0 hover:bg-panel"
    >
      <div className="grid grid-cols-2 items-baseline gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_7.5rem_8.5rem_8.5rem_5rem]">
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <span className="stamp-lg text-fg transition-colors group-hover:text-accent">{position.symbol}</span>
          {tags.length > 0 && (
            <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {tags.map((tag) => (
                <span key={tag} className="stamp text-fg-subtle">
                  {tag}
                </span>
              ))}
            </span>
          )}
        </div>

        <div>
          <p className="stamp text-fg-subtle sm:hidden">Avg entry</p>
          <p className="figure text-sm font-medium text-fg">{formatCurrency(metrics.avgEntryPrice)}</p>
          <p className="fix-stamp text-[11px] text-fg-subtle">{metrics.openQty} sh</p>
        </div>

        <div>
          <p className="stamp text-fg-subtle sm:hidden">Last fix</p>
          {isLoading && !quote ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <p key={quote?.asOf ?? "no-fix"} className="figure animate-fix-stamp text-sm font-medium text-fg">
              {quote?.price !== null && quote?.price !== undefined ? formatCurrency(quote.price) : "—"}
            </p>
          )}
          {quote?.asOf && (
            <p className="fix-stamp text-[11px] text-fg-subtle" title={new Date(quote.asOf).toLocaleString()}>
              {formatDistanceToNow(new Date(quote.asOf), { addSuffix: true })}
            </p>
          )}
        </div>

        <div>
          <p className="stamp text-fg-subtle sm:hidden">Unrealized</p>
          {metrics.unrealizedPnl !== null ? (
            <>
              <PnlText
                key={quote?.asOf ?? "no-fix"}
                value={metrics.unrealizedPnl}
                formatted={formatCurrency(metrics.unrealizedPnl, { signed: true })}
                className="figure animate-fix-stamp text-base"
              />
              <p
                className={cn(
                  "figure text-[11px]",
                  metrics.returnPct !== null && metrics.returnPct >= 0 ? "text-gain" : "text-loss"
                )}
              >
                {metrics.returnPct !== null ? formatPct(metrics.returnPct, { signed: true }) : "—"}
              </p>
            </>
          ) : (
            <p className="figure text-sm text-fg-subtle">—</p>
          )}
        </div>

        <div>
          <p className="stamp text-fg-subtle sm:hidden">Held</p>
          <p className="figure text-sm text-fg-muted">{metrics.daysHeld}d</p>
        </div>
      </div>
    </Link>
  );
}
