"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { X } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { PnlText } from "@/components/ui/PnlText";
import { useQuotes } from "@/hooks/useQuotes";
import { usePositionStore } from "@/store/usePositionStore";
import { computePositionMetrics } from "@/lib/positionMetrics";
import { formatCurrency, glyph } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { WatchlistItem } from "@/lib/types";

/**
 * One watched symbol, as an entry on the sheet. The row divider lives on the
 * wrapper in WatchlistStrip (each row sits in its own draggable item), so this
 * renders the row body only. `handle` is the drag grip, drawn left of the row.
 */
export function WatchlistCard({ item, handle }: { item: WatchlistItem; handle?: ReactNode }) {
  const { symbol } = item;
  const { quotes } = useQuotes([symbol]);
  const quote = quotes.get(symbol);
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

  const loadingQuote = !quote;

  return (
    <div className="flex items-center gap-2 py-3 transition-colors duration-100 hover:bg-panel">
      {handle}
      <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1.5 sm:grid-cols-[8rem_7rem_6.5rem_1fr_1.5rem]">
        {openPosition ? (
          <Link
            href={`/positions/${openPosition.id}`}
            className="stamp-lg text-fg transition-colors hover:text-accent"
          >
            {symbol}
            <span className="stamp ml-2 text-fg-subtle">held</span>
          </Link>
        ) : (
          <span className="stamp-lg text-fg">{symbol}</span>
        )}

        {loadingQuote ? (
          <Skeleton className="h-5 w-16 justify-self-end sm:justify-self-auto" />
        ) : (
          <span
            key={`price-${quote.asOf ?? "no-fix"}`}
            className="figure animate-fix-stamp justify-self-end text-sm font-medium text-fg sm:justify-self-auto"
          >
            {quote.price !== null ? formatCurrency(quote.price) : "—"}
          </span>
        )}

        {!loadingQuote && (
          <span
            key={`change-${quote.asOf ?? "no-fix"}`}
            className={cn(
              "figure animate-fix-stamp text-sm",
              quote.changePct !== null && quote.changePct > 0
                ? "text-gain"
                : quote.changePct !== null && quote.changePct < 0
                  ? "text-loss"
                  : "text-fg-muted"
            )}
          >
            {quote.changePct !== null ? (
              <>
                <span aria-hidden="true">{glyph(quote.changePct)} </span>
                {quote.changePct > 0 ? "+" : quote.changePct < 0 ? "−" : ""}
                {Math.abs(quote.changePct).toFixed(2)}%
              </>
            ) : (
              "—"
            )}
          </span>
        )}

        <span className="fix-stamp col-span-2 text-[11px] text-fg-subtle sm:col-span-1">
          {quote?.asOf ? (
            <span title={new Date(quote.asOf).toLocaleString()}>
              fix {formatDistanceToNow(new Date(quote.asOf), { addSuffix: true })}
            </span>
          ) : (
            <span>watching since {new Date(item.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          )}
          {positionMetrics?.unrealizedPnl != null && (
            <>
              {" · "}
              <PnlText
                value={positionMetrics.unrealizedPnl}
                formatted={formatCurrency(positionMetrics.unrealizedPnl, { signed: true })}
                className="text-[11px]"
              />
            </>
          )}
        </span>

        <button
          type="button"
          onClick={() => removeWatchlistSymbol(symbol)}
          className="col-start-2 row-start-1 flex h-6 w-6 items-center justify-center justify-self-end text-fg-subtle transition-colors hover:text-loss sm:col-start-auto sm:row-start-auto"
          title={`Remove ${symbol} from watchlist`}
        >
          <X className="h-3.5 w-3.5" />
          <span className="sr-only">Remove {symbol} from watchlist</span>
        </button>
      </div>
    </div>
  );
}
