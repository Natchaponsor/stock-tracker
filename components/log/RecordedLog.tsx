"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { NsCard, NsEmpty, NsPnl, SymbolMark } from "@/components/navy/primitives";
import { useQuotes } from "@/hooks/useQuotes";
import { usePositionStore } from "@/store/usePositionStore";
import { buildLedger, type LedgerRow } from "@/lib/ledger";
import { formatCurrency, formatPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { usePlatform } from "@/hooks/usePlatform";

const COLUMNS = "sm:grid-cols-[minmax(0,1fr)_7rem_8rem_9rem]";

function LogEntry({ row, tags, fix }: { row: LedgerRow; tags: string[]; fix: string }) {
  const isBuy = row.kind === "buy";

  return (
    <Link
      href={`/positions/${row.positionId}`}
      className="group -mx-2 block rounded-ns-md px-2 py-3 transition-colors hover:bg-ns-sunken"
    >
      {/* Narrow: stock and P&L on one line, date and fill under them. Wide: one table row. */}
      <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1", COLUMNS)}>
        <div className="flex min-w-0 items-center gap-3">
          <SymbolMark symbol={row.symbol} />
          <div className="min-w-0">
            <p className="flex items-center gap-2">
              <span className="ns-body font-semibold text-ns-ink transition-colors group-hover:text-ns-primary-text">
                {row.symbol}
              </span>
              {/* Buy and sell are labelled, not coloured: green and red stay for gain and loss. */}
              <span className={cn("oc-badge", isBuy ? "oc-badge-info" : "bg-ns-sunken text-ns-ink-muted")}>
                {isBuy ? "Buy" : "Sell"}
              </span>
            </p>
            <p className="ns-caption mt-0.5 truncate font-normal text-ns-ink-subtle">
              {format(new Date(row.date), "MMM d, yyyy")}
              <span className="sm:hidden">
                {" · "}
                {row.qty} sh at {formatCurrency(row.price)}
              </span>
              {isBuy && tags.length > 0 && ` · ${tags.join(", ")}`}
            </p>
          </div>
        </div>

        <p className="ns-label oc-num hidden font-normal text-ns-ink-muted sm:block">{row.qty} sh</p>

        <div className="hidden sm:block">
          <p className="ns-label oc-num text-ns-ink">{formatCurrency(row.price)}</p>
          <p className="ns-caption font-normal text-ns-ink-subtle">{isBuy ? "Entry" : "Sold at"}</p>
        </div>

        <div className="text-right sm:text-left">
          {row.pnl !== null ? (
            <>
              <NsPnl
                key={isBuy ? fix : undefined}
                value={row.pnl}
                formatted={formatCurrency(row.pnl, { signed: true })}
                className={cn("ns-body font-semibold", isBuy && "animate-fix-stamp")}
              />
              <p className="ns-caption font-normal text-ns-ink-subtle">
                {row.returnPct !== null && (
                  <span className={row.returnPct >= 0 ? "text-ns-success" : "text-ns-danger"}>
                    {formatPct(row.returnPct, { signed: true })}
                  </span>
                )}
                {row.returnPct !== null && " · "}
                {isBuy ? "Unrealized" : "Realized"}
              </p>
            </>
          ) : (
            <>
              <p className="ns-body text-ns-ink-subtle">—</p>
              <p className="ns-caption font-normal text-ns-ink-subtle">{row.soldOut ? "Sold out" : "Pending quote"}</p>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * The web version of the log: a Navy Stream DataTable. Each row opens its
 * position; the symbol is the row's link so keyboard users can reach it too.
 */
function LogTable({
  rows,
  tagsByPosition,
  fixFor,
}: {
  rows: LedgerRow[];
  tagsByPosition: Map<string, string[]>;
  fixFor: (symbol: string) => string;
}) {
  const router = useRouter();
  return (
    <table className="oc-table hidden md:table">
      <thead>
        <tr>
          <th>Stock</th>
          <th>Date</th>
          <th className="oc-optional">Shares</th>
          <th>Price</th>
          <th className="oc-right">P&amp;L</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const isBuy = row.kind === "buy";
          const tags = isBuy ? (tagsByPosition.get(row.positionId) ?? []) : [];
          return (
            <tr
              key={row.key}
              onClick={() => router.push(`/positions/${row.positionId}`)}
              className="cursor-pointer"
            >
              <td>
                <div className="oc-ticker">
                  <SymbolMark symbol={row.symbol} size={34} />
                  <div className="min-w-0">
                    <span className="flex items-center gap-2">
                      <Link
                        href={`/positions/${row.positionId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-ns-ink no-underline hover:text-ns-primary-text"
                      >
                        {row.symbol}
                      </Link>
                      <span className={cn("oc-badge", isBuy ? "oc-badge-info" : "bg-ns-sunken text-ns-ink-muted")}>
                        {isBuy ? "Buy" : "Sell"}
                      </span>
                    </span>
                    {tags.length > 0 && <div className="oc-sub truncate font-normal">{tags.join(", ")}</div>}
                  </div>
                </div>
              </td>
              <td className="text-ns-ink-muted">{format(new Date(row.date), "MMM d, yyyy")}</td>
              <td className="oc-optional text-ns-ink-muted">{row.qty} sh</td>
              <td>
                {formatCurrency(row.price)}
                <div className="oc-sub">{isBuy ? "Entry" : "Sold at"}</div>
              </td>
              <td className="oc-right">
                {row.pnl !== null ? (
                  <>
                    <NsPnl
                      key={isBuy ? fixFor(row.symbol) : undefined}
                      value={row.pnl}
                      formatted={formatCurrency(row.pnl, { signed: true })}
                      className={cn("font-semibold", isBuy && "animate-fix-stamp")}
                    />
                    <div className="oc-sub">
                      {row.returnPct !== null && (
                        <span className={row.returnPct >= 0 ? "oc-up" : "oc-down"}>
                          {formatPct(row.returnPct, { signed: true })}
                        </span>
                      )}
                      {row.returnPct !== null && " · "}
                      {isBuy ? "Unrealized" : "Realized"}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-ns-ink-subtle">—</span>
                    <div className="oc-sub">{row.soldOut ? "Sold out" : "Pending quote"}</div>
                  </>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Every buy and sell on the book, newest first. A buy reports what its shares
 * are worth against its entry price now (unrealized); a sell reports what the
 * sale locked in (realized). Both reconcile with the Profit & Loss band above.
 */
export function RecordedLog({ className, defaultOpen = true }: { className?: string; defaultOpen?: boolean }) {
  const platform = usePlatform();
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
    <NsCard
      title="Recorded log"
      meta={`${rows.length} ${rows.length === 1 ? "entry" : "entries"} · newest first`}
      className={className}
      collapsible
      defaultOpen={defaultOpen}
    >
      {rows.length === 0 ? (
        <NsEmpty
          title="Nothing recorded"
          description="Log a buy or a sell and it shows up here, with its price, date, and what it has made."
        />
      ) : (
        <div>
          {platform !== "phone" && (
            <LogTable
              rows={rows}
              tagsByPosition={tagsByPosition}
              fixFor={(symbol) => quotes.get(symbol)?.asOf ?? "no-fix"}
            />
          )}
          {/* Phones keep the list rows. */}
          {platform !== "web" && (
            <>
              <div
                className={cn(
                  "ns-caption hidden border-b border-ns-line pb-2 text-ns-ink-subtle sm:grid sm:gap-x-4 md:hidden!",
                  COLUMNS
                )}
              >
                <span>Stock</span>
                <span>Shares</span>
                <span>Price</span>
                <span>P&amp;L</span>
              </div>
              <div className="divide-y divide-ns-line md:hidden">
                {rows.map((row) => (
                  <LogEntry
                    key={row.key}
                    row={row}
                    tags={tagsByPosition.get(row.positionId) ?? []}
                    fix={quotes.get(row.symbol)?.asOf ?? "no-fix"}
                  />
                ))}
              </div>
            </>
          )}
          <p className="ns-caption mt-3 font-normal text-ns-ink-subtle">
            P&amp;L uses each position&apos;s average entry price, so these rows add up to the Profit &amp; loss card.
          </p>
        </div>
      )}
    </NsCard>
  );
}
