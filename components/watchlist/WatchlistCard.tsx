"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { NsChangeBadge, NsPnl, NsSkeleton, SymbolMark } from "@/components/navy/primitives";
import { useQuotes } from "@/hooks/useQuotes";
import { usePositionStore } from "@/store/usePositionStore";
import { computePositionMetrics } from "@/lib/positionMetrics";
import { formatCurrency } from "@/lib/format";
import { formatAsOf } from "@/lib/priceTime";
import { useNow } from "@/components/log/clock";
import type { WatchlistItem } from "@/lib/types";

/**
 * One watched symbol. The row divider lives on the wrapper in WatchlistStrip
 * (each row sits in its own draggable item), so this renders the row body
 * only. `handle` is the drag grip, drawn left of the row.
 */
export function WatchlistCard({ item, handle }: { item: WatchlistItem; handle?: ReactNode }) {
  const { symbol } = item;
  const { quotes } = useQuotes([symbol]);
  const quote = quotes.get(symbol);
  const removeWatchlistSymbol = usePositionStore((s) => s.removeWatchlistSymbol);
  const now = useNow();
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
  const changePct = quote?.changePct ?? null;

  return (
    <div className="flex items-center gap-2.5 py-3">
      {handle}
      <SymbolMark symbol={symbol} />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          {openPosition ? (
            <Link
              href={`/positions/${openPosition.id}`}
              className="ns-body font-semibold text-ns-ink transition-colors hover:text-ns-primary-text"
            >
              {symbol}
            </Link>
          ) : (
            <span className="ns-body font-semibold text-ns-ink">{symbol}</span>
          )}
          {openPosition && <span className="oc-badge oc-badge-info">Held</span>}
        </p>
        <p className="ns-caption mt-0.5 truncate font-normal text-ns-ink-subtle">
          {quote?.asOf ? (
            <span title={new Date(quote.asOf).toLocaleString()}>
              As of {formatAsOf(new Date(quote.asOf), now === null ? null : new Date(now))}
            </span>
          ) : (
            <span>
              Watching since {new Date(item.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
          {positionMetrics?.unrealizedPnl != null && (
            <>
              {" · "}
              <NsPnl
                value={positionMetrics.unrealizedPnl}
                formatted={formatCurrency(positionMetrics.unrealizedPnl, { signed: true })}
                showGlyph={false}
              />
            </>
          )}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {loadingQuote ? (
          <>
            <NsSkeleton className="h-5 w-16" />
            <NsSkeleton className="h-4 w-12" />
          </>
        ) : (
          <>
            <span
              key={`price-${quote.asOf ?? "no-fix"}`}
              className="ns-body oc-num animate-fix-stamp font-semibold text-ns-ink"
            >
              {quote.price !== null ? formatCurrency(quote.price) : "—"}
            </span>
            <NsChangeBadge value={changePct}>
              {changePct !== null
                ? `${changePct > 0 ? "+" : changePct < 0 ? "−" : ""}${Math.abs(changePct).toFixed(2)}%`
                : "No change"}
            </NsChangeBadge>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => removeWatchlistSymbol(symbol)}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ns-ink-subtle transition-colors hover:bg-ns-danger-soft hover:text-ns-danger"
        title={`Remove ${symbol} from watchlist`}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Remove {symbol} from watchlist</span>
      </button>
    </div>
  );
}
