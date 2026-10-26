"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Band, EmptyEntry } from "@/components/log/Band";
import { PnlText } from "@/components/ui/PnlText";
import { useQuotes } from "@/hooks/useQuotes";
import { usePositionStore } from "@/store/usePositionStore";
import { buildLedger, type LedgerRow } from "@/lib/ledger";
import { formatCurrency, formatPct } from "@/lib/format";
import { cn } from "@/lib/cn";

const COLUMNS = "sm:grid-cols-[6.5rem_4.5rem_minmax(0,1fr)_5rem_7.5rem_9.5rem]";

function LogEntry({ row, tags, fix }: { row: LedgerRow; tags: string[]; fix: string }) {
  const isBuy = row.kind === "buy";

  return (
    <Link
      href={`/positions/${row.positionId}`}
      className="group block border-b border-rule py-3.5 transition-colors last:border-b-0 hover:bg-panel"
    >
      {/* Narrow: date + side / stock beside its P&L / shares + price. Wide: one ruled table row. */}
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-2",
          COLUMNS
        )}
      >
        <p className="figure text-sm text-fg-muted">{format(new Date(row.date), "MMM d, yyyy")}</p>

        {/* Buy is a solid block, sell a hollow one — the label carries the meaning, the
            block only aids scanning. Green/red stay reserved for gain and loss. */}
        <p className="flex items-center gap-2 justify-self-end sm:justify-self-start">
          <span
            aria-hidden="true"
            className={cn("h-2 w-2 shrink-0", isBuy ? "bg-fg" : "border border-fg-muted")}
          />
          <span className="stamp text-fg">{isBuy ? "Buy" : "Sell"}</span>
        </p>

        <div className="min-w-0">
          <span className="stamp-lg text-fg transition-colors group-hover:text-accent">{row.symbol}</span>
          {isBuy && tags.length > 0 && (
            <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {tags.map((tag) => (
                <span key={tag} className="stamp text-fg-subtle">
                  {tag}
                </span>
              ))}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-x-4 sm:contents">
          <p className="figure text-sm text-fg-muted">{row.qty} sh</p>

          <div className="flex items-baseline gap-x-1.5 sm:block">
            <p className="figure text-sm font-medium text-fg">{formatCurrency(row.price)}</p>
            <p className="fix-stamp text-[11px] text-fg-subtle">{isBuy ? "entry" : "sold at"}</p>
          </div>
        </div>

        <div className="col-start-2 row-span-2 row-start-2 text-right sm:col-auto sm:row-auto sm:row-span-1 sm:text-left">
          {row.pnl !== null ? (
            <>
              <PnlText
                key={isBuy ? fix : undefined}
                value={row.pnl}
                formatted={formatCurrency(row.pnl, { signed: true })}
                className={cn("figure text-base", isBuy && "animate-fix-stamp")}
              />
              <p className="fix-stamp text-[11px] text-fg-subtle">
                {row.returnPct !== null && (
                  <span className={row.returnPct >= 0 ? "text-gain" : "text-loss"}>
                    {formatPct(row.returnPct, { signed: true })}
                  </span>
                )}
                {row.returnPct !== null && " · "}
                {isBuy ? "unrealized" : "realized"}
              </p>
            </>
          ) : (
            <>
              <p className="figure text-sm text-fg-subtle">—</p>
              <p className="fix-stamp text-[11px] text-fg-subtle">{row.soldOut ? "sold out" : "pending quote"}</p>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * Every buy and sell on the book, newest first. A buy reports what its shares
 * are worth against its entry price now (unrealized); a sell reports what the
 * sale locked in (realized). Both reconcile with the Profit & Loss band above.
 */
export function RecordedLog() {
  const positions = usePositionStore((s) => s.positions);
  const strategies = usePositionStore((s) => s.strategies);

  const openSymbols = useMemo(
    () => Array.from(new Set(positions.filter((p) => p.status === "open").map((p) => p.symbol))),
    [positions]
  );
  const { quotes } = useQuotes(openSymbols);

  const rows = useMemo(() => {
    const prices = new Map<string, number | null>();
    for (const [symbol, quote] of quotes) prices.set(symbol, quote.price);
    return buildLedger(positions, prices);
  }, [positions, quotes]);

  const tagsByPosition = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of positions) {
      map.set(p.id, [
        ...p.strategyIds.map((id) => strategies.find((s) => s.id === id)?.name).filter((n): n is string => Boolean(n)),
        ...p.customTags,
      ]);
    }
    return map;
  }, [positions, strategies]);

  return (
    <Band
      title="Recorded log"
      meta={`${rows.length} ${rows.length === 1 ? "entry" : "entries"} · newest first`}
    >
      {rows.length === 0 ? (
        <EmptyEntry
          title="Nothing recorded"
          description="Log a buy or a sell and it is entered here, with its price, date, and what it has made."
        />
      ) : (
        <div>
          <div className={cn("stamp hidden border-b border-rule pb-2 text-fg-subtle sm:grid sm:gap-x-4", COLUMNS)}>
            <span>Date</span>
            <span>Side</span>
            <span>Stock</span>
            <span>Shares</span>
            <span>Price</span>
            <span>P&amp;L</span>
          </div>
          {rows.map((row) => (
            <LogEntry
              key={row.key}
              row={row}
              tags={tagsByPosition.get(row.positionId) ?? []}
              fix={quotes.get(row.symbol)?.asOf ?? "no-fix"}
            />
          ))}
          <p className="fix-stamp mt-4 text-[11px] text-fg-subtle">
            P&amp;L uses each position&apos;s average entry price, so these rows add up to the Profit &amp; loss band.
          </p>
        </div>
      )}
    </Band>
  );
}
