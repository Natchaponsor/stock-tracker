"use client";

import { useMemo } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Sparkline } from "@/components/charts/Sparkline";
import { PnlText } from "@/components/ui/PnlText";
import { useQuotes } from "@/hooks/useQuotes";
import { useHistory } from "@/hooks/useHistory";
import { usePositionStore } from "@/store/usePositionStore";
import { computePositionMetrics } from "@/lib/positionMetrics";
import { readSignal } from "@/lib/signal";
import { formatCurrency, glyph } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { WatchlistItem } from "@/lib/types";

export function WatchlistCard({ item }: { item: WatchlistItem }) {
  const { symbol } = item;
  const { quotes } = useQuotes([symbol]);
  const quote = quotes.get(symbol);
  const { closes, trend, hasEnoughData, isLoading: historyLoading } = useHistory(symbol);
  const removeWatchlistSymbol = usePositionStore((s) => s.removeWatchlistSymbol);
  const positions = usePositionStore((s) => s.positions);

  const openPosition = useMemo(
    () => positions.find((p) => p.symbol === symbol && p.status === "open"),
    [positions, symbol]
  );

  const positionMetrics = useMemo(() => {
    if (!openPosition) return null;
    return computePositionMetrics(openPosition, quote?.price ?? null);
  }, [openPosition, quote]);

  const signal = readSignal(trend, hasEnoughData);
  const sparkData = useMemo(() => closes.slice(-30).map((v) => ({ value: v })), [closes]);

  const loadingQuote = !quote;

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        {openPosition ? (
          <Link href={`/positions/${openPosition.id}`} className="min-w-0">
            <div className="font-serif text-base font-medium text-fg">{symbol}</div>
          </Link>
        ) : (
          <div className="font-serif text-base font-medium text-fg">{symbol}</div>
        )}
        <div className="flex items-start gap-1.5">
          {loadingQuote ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <div className="text-right">
              <div className="text-sm font-semibold tabular-nums text-fg">
                {quote.price !== null ? `$${quote.price.toFixed(2)}` : "—"}
              </div>
              <div
                className={cn(
                  "text-[11px] tabular-nums",
                  quote.changePct !== null && quote.changePct > 0
                    ? "text-gain"
                    : quote.changePct !== null && quote.changePct < 0
                      ? "text-loss"
                      : "text-fg-muted"
                )}
              >
                {quote.changePct !== null ? `${glyph(quote.changePct)} ${Math.abs(quote.changePct).toFixed(2)}%` : "—"}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => removeWatchlistSymbol(symbol)}
            className="rounded p-0.5 text-fg-subtle hover:text-loss transition-colors"
            title={`Remove ${symbol} from watchlist`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="h-9">
        {historyLoading ? (
          <Skeleton className="h-full w-full" />
        ) : sparkData.length > 1 ? (
          <Sparkline data={sparkData} color={signal.tone === "bad" ? "var(--color-loss)" : "var(--color-gain)"} />
        ) : null}
      </div>

      <span
        className={cn(
          "w-fit rounded-md px-2 py-1 text-[11px] font-medium",
          signal.tone === "good" && "bg-gain/10 text-gain",
          signal.tone === "bad" && "bg-loss/10 text-loss",
          signal.tone === "neutral" && "bg-panel text-fg-muted"
        )}
      >
        {signal.label}
      </span>

      {openPosition && positionMetrics ? (
        <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
          <span className="text-fg-subtle">Position</span>
          {positionMetrics.unrealizedPnl !== null ? (
            <PnlText
              value={positionMetrics.unrealizedPnl}
              formatted={formatCurrency(positionMetrics.unrealizedPnl, { signed: true })}
            />
          ) : (
            <span className="text-fg-subtle">—</span>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-fg-subtle">
          <span>Watching</span>
          <span>since {new Date(item.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>
      )}
    </div>
  );
}
