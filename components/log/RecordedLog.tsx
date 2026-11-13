"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Trash2, Wallet } from "lucide-react";
import { NsCard, NsEmpty, NsPnl, SymbolMark } from "@/components/navy/primitives";
import { useQuotes } from "@/hooks/useQuotes";
import { usePositionStore } from "@/store/usePositionStore";
import { buildLedger, type LedgerRow } from "@/lib/ledger";
import { formatCurrency, formatPct } from "@/lib/format";
import { depositUsd } from "@/lib/cash";
import { formatRate, formatRateDate } from "@/lib/fx";
import { cn } from "@/lib/cn";
import { usePlatform } from "@/hooks/usePlatform";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { CashDeposit } from "@/lib/types";

/** One line of the log: a trade from the ledger, or a cash deposit. */
type LogItem = { type: "trade"; key: string; date: string; row: LedgerRow } | { type: "cash"; key: string; date: string; deposit: CashDeposit };

/** Trades and deposits, newest first; on the same instant a trade reads first. */
function mergeLog(rows: LedgerRow[], deposits: CashDeposit[]): LogItem[] {
  const items: LogItem[] = [
    ...rows.map((row) => ({ type: "trade" as const, key: row.key, date: row.date, row })),
    ...deposits.map((deposit) => ({ type: "cash" as const, key: `cash:${deposit.id}`, date: deposit.date, deposit })),
  ];
  // Array.prototype.sort is stable, so the ledger's own order holds within a day.
  return items.sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || (a.type === b.type ? 0 : a.type === "trade" ? -1 : 1));
}

/** "at 33.515 THB/USD · reference rate", or "US dollars". The fix's own day is in the tooltip. */
function depositRateLine(d: CashDeposit): string {
  if (d.currency === "USD") return "US dollars";
  return `at ${formatRate(d.rate)} ${d.currency}/USD · ${d.rateSource === "reference" ? "reference rate" : "your rate"}`;
}

function depositRateTitle(d: CashDeposit): string | undefined {
  return d.rateSource === "reference" && d.rateDate ? `Daily reference rate fixed ${formatRateDate(d.rateDate)}` : undefined;
}

function CashMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-ns-primary-soft text-ns-primary-text"
    >
      <Wallet className="h-4 w-4" />
    </span>
  );
}

function RemoveDepositButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="Remove this deposit"
      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ns-ink-subtle transition-colors hover:bg-ns-danger-soft hover:text-ns-danger"
    >
      <Trash2 className="h-3.5 w-3.5" />
      <span className="sr-only">Remove this deposit</span>
    </button>
  );
}

/** A deposit is capital, not a gain: its amount reads in ink, never green. */
function CashEntry({ deposit, onRemove }: { deposit: CashDeposit; onRemove: () => void }) {
  const usd = depositUsd(deposit);
  return (
    <div className="-mx-2 px-2 py-3">
      <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1", COLUMNS)}>
        <div className="flex min-w-0 items-center gap-3">
          <CashMark />
          <div className="min-w-0">
            <p className="flex items-center gap-2">
              <span className="ns-body font-semibold text-ns-ink">Cash</span>
              <span className="oc-badge bg-ns-sunken text-ns-ink-muted">Deposit</span>
            </p>
            <p className="ns-caption mt-0.5 truncate font-normal text-ns-ink-subtle">
              {format(new Date(deposit.date), "MMM d, yyyy")}
              <span className="sm:hidden">
                {deposit.currency !== "USD" && ` · ${formatCurrency(deposit.amount, { currency: deposit.currency })}`}
              </span>
              {deposit.note && ` · ${deposit.note}`}
            </p>
          </div>
        </div>

        <p className="ns-label oc-num hidden font-normal text-ns-ink-subtle sm:block">—</p>

        <div className="hidden min-w-0 sm:block">
          <p className="ns-label oc-num truncate text-ns-ink">{formatCurrency(deposit.amount, { currency: deposit.currency })}</p>
          <p className="ns-caption truncate font-normal text-ns-ink-subtle" title={depositRateTitle(deposit)}>
            {depositRateLine(deposit)}
          </p>
        </div>

        <div className="flex items-center justify-end gap-1 sm:justify-start">
          <div className="text-right sm:text-left">
            <p className="ns-body oc-num font-semibold text-ns-ink">{formatCurrency(usd, { signed: true })}</p>
            <p className="ns-caption font-normal text-ns-ink-subtle">Added to cash</p>
          </div>
          <RemoveDepositButton onClick={onRemove} />
        </div>
      </div>
    </div>
  );
}

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
  items,
  tagsByPosition,
  fixFor,
  onRemoveDeposit,
}: {
  items: LogItem[];
  tagsByPosition: Map<string, string[]>;
  fixFor: (symbol: string) => string;
  onRemoveDeposit: (deposit: CashDeposit) => void;
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
        {items.map((item) => {
          if (item.type === "cash") {
            const d = item.deposit;
            return (
              <tr key={item.key}>
                <td>
                  <div className="oc-ticker">
                    <CashMark size={34} />
                    <div className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-ns-ink">Cash</span>
                        <span className="oc-badge bg-ns-sunken text-ns-ink-muted">Deposit</span>
                      </span>
                      {d.note && <div className="oc-sub truncate font-normal">{d.note}</div>}
                    </div>
                  </div>
                </td>
                <td className="text-ns-ink-muted">{format(new Date(d.date), "MMM d, yyyy")}</td>
                <td className="oc-optional text-ns-ink-subtle">—</td>
                <td>
                  {formatCurrency(d.amount, { currency: d.currency })}
                  <div className="oc-sub" title={depositRateTitle(d)}>
                    {depositRateLine(d)}
                  </div>
                </td>
                <td className="oc-right">
                  <div className="flex items-center justify-end gap-1">
                    <div>
                      <span className="font-semibold text-ns-ink">{formatCurrency(depositUsd(d), { signed: true })}</span>
                      <div className="oc-sub">Added to cash</div>
                    </div>
                    <RemoveDepositButton onClick={() => onRemoveDeposit(d)} />
                  </div>
                </td>
              </tr>
            );
          }
          const row = item.row;
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
 * Every buy, sell and cash deposit on the book, newest first. A buy reports
 * what its shares are worth against its entry price now (unrealized); a sell
 * reports what the sale locked in (realized). Both reconcile with the Profit &
 * Loss band above. A deposit shows what it added to cash, never as a gain.
 */
export function RecordedLog({ className, defaultOpen = true }: { className?: string; defaultOpen?: boolean }) {
  const platform = usePlatform();
  const positions = usePositionStore((s) => s.positions);
  const strategies = usePositionStore((s) => s.strategies);
  const cashDeposits = usePositionStore((s) => s.cashDeposits);
  const deleteCashDeposit = usePositionStore((s) => s.deleteCashDeposit);
  const [removing, setRemoving] = useState<CashDeposit | null>(null);

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
  const items = useMemo(() => mergeLog(rows, cashDeposits), [rows, cashDeposits]);

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
      meta={`${items.length} ${items.length === 1 ? "entry" : "entries"} · newest first`}
      className={className}
      collapsible
      defaultOpen={defaultOpen}
    >
      {items.length === 0 ? (
        <NsEmpty
          title="Nothing recorded"
          description="Log a buy, a sell or a cash deposit and it shows up here, with its price, date, and what it has made."
        />
      ) : (
        <div>
          {platform !== "phone" && (
            <LogTable
              items={items}
              tagsByPosition={tagsByPosition}
              fixFor={(symbol) => quotes.get(symbol)?.asOf ?? "no-fix"}
              onRemoveDeposit={setRemoving}
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
                {items.map((item) =>
                  item.type === "cash" ? (
                    <CashEntry key={item.key} deposit={item.deposit} onRemove={() => setRemoving(item.deposit)} />
                  ) : (
                    <LogEntry
                      key={item.key}
                      row={item.row}
                      tags={tagsByPosition.get(item.row.positionId) ?? []}
                      fix={quotes.get(item.row.symbol)?.asOf ?? "no-fix"}
                    />
                  )
                )}
              </div>
            </>
          )}
          <p className="ns-caption mt-3 font-normal text-ns-ink-subtle">
            P&amp;L uses each position&apos;s average entry price, so these rows add up to the Profit &amp; loss card.
            {cashDeposits.length > 0 && " Deposits are capital, so they never count as profit."}
          </p>
        </div>
      )}
      <ConfirmDialog
        open={removing !== null}
        title="Remove this deposit?"
        description={
          removing
            ? `This takes ${formatCurrency(depositUsd(removing))}${
                removing.currency !== "USD" ? ` (${formatCurrency(removing.amount, { currency: removing.currency })})` : ""
              } from ${format(new Date(removing.date), "MMM d, yyyy")} out of your cash balance and the log.`
            : ""
        }
        confirmLabel="Remove deposit"
        tone="danger"
        onConfirm={() => {
          if (removing) deleteCashDeposit(removing.id);
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />
    </NsCard>
  );
}
