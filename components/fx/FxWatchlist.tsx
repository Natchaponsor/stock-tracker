"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Bell, Plus, X } from "lucide-react";
import { NsCard, NsEmpty } from "@/components/navy/primitives";
import { Button } from "@/components/ui/Button";
import { Sparkline } from "@/components/charts/Sparkline";
import { CurrencySelect, FxChange, InlineSkeleton } from "@/components/fx/FxBits";
import { useFxHistory } from "@/hooks/useFx";
import { usePlatform } from "@/hooks/usePlatform";
import { usePositionStore } from "@/store/usePositionStore";
import {
  changeOver,
  directionLabel,
  formatRate,
  formatRateDate,
  lastDays,
  makePair,
  pairSlug,
  ratePercentile,
} from "@/lib/fx";
import { cn } from "@/lib/cn";
import type { FxWatchItem } from "@/lib/types";

/** About 13 months: enough for the 1-month change, the sparkline and the year percentile. */
const ROW_DAYS = 400;

function useRowData(item: FxWatchItem) {
  const { bars, latest, isLoading, hasError } = useFxHistory(item.pair, ROW_DAYS);
  const alerts = usePositionStore((s) => s.fxAlerts.filter((a) => a.pair === item.pair && a.state !== "paused").length);
  return {
    latest,
    isLoading,
    hasError,
    week: changeOver(bars, 7),
    month: changeOver(bars, 30),
    percentile: ratePercentile(bars, item.direction),
    spark: lastDays(bars, 92).map((b) => ({ value: b.rate })),
    alerts,
  };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function PercentileText({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ns-ink-subtle">—</span>;
  return <span>{ordinal(Math.round(value * 100))} pct</span>;
}

function ReorderButtons({ index, count, onMove }: { index: number; count: number; onMove: (to: number) => void }) {
  const btn = "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ns-ink-muted hover:bg-ns-sunken hover:text-ns-ink disabled:opacity-30";
  return (
    <span className="flex shrink-0">
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label="Move up">
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" className={btn} disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label="Move down">
        <ArrowDown className="h-4 w-4" aria-hidden="true" />
      </button>
    </span>
  );
}

function RemoveButton({ pair }: { pair: FxWatchItem["pair"] }) {
  const removeFxPair = usePositionStore((s) => s.removeFxPair);
  const alerts = usePositionStore((s) => s.fxAlerts.filter((a) => a.pair === pair).length);
  return (
    <button
      type="button"
      onClick={() => {
        if (alerts === 0 || window.confirm(`Remove ${pair} and its ${alerts} alert${alerts === 1 ? "" : "s"}?`)) removeFxPair(pair);
      }}
      aria-label={`Remove ${pair}`}
      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ns-ink-subtle hover:bg-ns-sunken hover:text-ns-danger"
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/** Phone row: two lines, the whole row links to the pair. */
function PhoneRow({ item, editing, index, count, onMove }: RowProps) {
  const d = useRowData(item);
  return (
    <li className="flex items-center gap-2 border-t border-ns-line py-3 first:border-t-0">
      {editing && <ReorderButtons index={index} count={count} onMove={onMove} />}
      <Link href={`/fx/${pairSlug(item.pair)}`} className="flex min-w-0 flex-1 items-center gap-3 no-underline">
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline justify-between gap-2">
            <span className="ns-body font-semibold text-ns-ink">{item.pair}</span>
            <span className="ns-body oc-num font-semibold text-ns-ink">
              {d.latest ? formatRate(d.latest.rate) : d.isLoading ? <InlineSkeleton className="h-4 w-14" /> : "—"}
            </span>
          </p>
          <p className="ns-caption mt-0.5 flex flex-wrap items-center gap-x-2 text-ns-ink-muted">
            <span>{directionLabel(item.pair, item.direction)}</span>
            <FxChange value={d.week} suffix="1W" />
            <FxChange value={d.month} suffix="1M" />
          </p>
          <p className="ns-caption mt-0.5 flex items-center gap-2 text-ns-ink-subtle">
            {d.alerts > 0 && (
              <span className="inline-flex items-center gap-1">
                <Bell className="h-3 w-3" aria-hidden="true" />
                {d.alerts} alert{d.alerts === 1 ? "" : "s"}
              </span>
            )}
            <PercentileText value={d.percentile} />
            <span>(1Y)</span>
          </p>
        </div>
        <div className="h-9 w-16 shrink-0" aria-hidden="true">
          <Sparkline data={d.spark} />
        </div>
      </Link>
      {editing && <RemoveButton pair={item.pair} />}
    </li>
  );
}

/** Web row in the data table. */
function TableRow({ item, editing, index, count, onMove }: RowProps) {
  const d = useRowData(item);
  return (
    <tr>
      <td>
        <div className="flex items-center gap-1">
          {editing && <ReorderButtons index={index} count={count} onMove={onMove} />}
          <div>
            <Link href={`/fx/${pairSlug(item.pair)}`} className="font-semibold text-ns-ink no-underline hover:text-ns-primary-text">
              {item.pair}
            </Link>
            <p className="oc-sub">{directionLabel(item.pair, item.direction)}</p>
          </div>
        </div>
      </td>
      <td className="oc-right oc-num font-semibold">
        {d.latest ? formatRate(d.latest.rate) : d.isLoading ? <InlineSkeleton className="h-4 w-14" /> : "—"}
      </td>
      <td className="oc-right">
        <FxChange value={d.week} />
      </td>
      <td className="oc-right">
        <FxChange value={d.month} />
      </td>
      <td
        className="oc-right oc-num hidden whitespace-nowrap text-ns-ink-muted lg:table-cell"
        title="Share of the past year's days this rate beats, for your direction"
      >
        <PercentileText value={d.percentile} />
      </td>
      <td className="hidden xl:table-cell">
        <div className="h-8 w-24" aria-hidden="true">
          <Sparkline data={d.spark} />
        </div>
      </td>
      <td className="oc-right text-ns-ink-muted">
        {d.alerts > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
            {d.alerts}
          </span>
        ) : (
          "—"
        )}
      </td>
      {editing && (
        <td className="oc-right">
          <RemoveButton pair={item.pair} />
        </td>
      )}
    </tr>
  );
}

interface RowProps {
  item: FxWatchItem;
  editing: boolean;
  index: number;
  count: number;
  onMove: (to: number) => void;
}

function AddPairForm({ home, onDone }: { home: string; onDone: () => void }) {
  const addFxPair = usePositionStore((s) => s.addFxPair);
  const fxWatchlist = usePositionStore((s) => s.fxWatchlist);
  const [base, setBase] = useState(home === "USD" ? "EUR" : "USD");
  const [quote, setQuote] = useState(home);
  const pair = makePair(base, quote);
  const exists = pair !== null && fxWatchlist.some((w) => w.pair === pair);

  return (
    <form
      className="mt-3 space-y-3 rounded-ns-md bg-ns-sunken p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!pair || exists) return;
        // Living in the quote currency usually means converting the base into it.
        addFxPair(pair, quote === home ? "base-to-quote" : "quote-to-base");
        onDone();
      }}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <CurrencySelect label="Base currency" value={base} onChange={setBase} />
        <span className="ns-body text-ns-ink-muted">/</span>
        <CurrencySelect label="Quote currency" value={quote} onChange={setQuote} />
      </div>
      <p className="ns-caption text-ns-ink-muted">
        {pair ? `${pair}: how many ${quote} one ${base} buys.` : "Pick two different currencies."}
        {exists && " Already on your list."}
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={!pair || exists}>
          Add pair
        </Button>
      </div>
    </form>
  );
}

/** The FX watchlist: a data table on the web set, a list on phones. */
export function FxWatchlist() {
  const fxWatchlist = usePositionStore((s) => s.fxWatchlist);
  const reorderFxWatchlist = usePositionStore((s) => s.reorderFxWatchlist);
  const home = usePositionStore((s) => s.homeCurrency);
  const platform = usePlatform();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  const firstPair = fxWatchlist[0]?.pair ?? null;
  const { latest } = useFxHistory(firstPair, ROW_DAYS);

  function move(from: number, to: number) {
    const pairs = fxWatchlist.map((w) => w.pair);
    const [moved] = pairs.splice(from, 1);
    pairs.splice(to, 0, moved);
    reorderFxWatchlist(pairs);
  }

  const rowProps = (item: FxWatchItem, index: number): RowProps => ({
    item,
    editing,
    index,
    count: fxWatchlist.length,
    onMove: (to) => move(index, to),
  });

  return (
    <NsCard
      title="Your pairs"
      meta={latest ? `Reference rates · ${formatRateDate(latest.date)}` : "Daily reference rates"}
      action={
        fxWatchlist.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)} aria-pressed={editing}>
            {editing ? "Done" : "Edit"}
          </Button>
        ) : null
      }
    >
      {fxWatchlist.length === 0 ? (
        <NsEmpty title="No pairs yet" description="Add a pair, or pick your home currency above to start with the usual ones." />
      ) : (
        <>
          {platform !== "web" && (
            <ul className="md:hidden">
              {fxWatchlist.map((item, i) => (
                <PhoneRow key={item.pair} {...rowProps(item, i)} />
              ))}
            </ul>
          )}
          {platform !== "phone" && (
            // Scrolls inside the card rather than spilling out of it on a narrow web layout.
            <div className="hidden overflow-x-auto md:block">
            <table className="oc-table">
              <thead>
                <tr>
                  <th>Pair</th>
                  <th className="oc-right">Rate</th>
                  <th className="oc-right">1W</th>
                  <th className="oc-right">1M</th>
                  <th className="oc-right hidden whitespace-nowrap lg:table-cell">vs 1Y</th>
                  <th className="hidden xl:table-cell">3M</th>
                  <th className="oc-right">Alerts</th>
                  {editing && (
                    <th className="oc-right">
                      <span className="sr-only">Remove</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {fxWatchlist.map((item, i) => (
                  <TableRow key={item.pair} {...rowProps(item, i)} />
                ))}
              </tbody>
            </table>
            </div>
          )}
        </>
      )}

      {adding ? (
        <AddPairForm home={home} onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={cn(
            "ns-label mt-2 flex w-full cursor-pointer items-center gap-2 rounded-ns-md px-1 py-2.5 text-ns-primary-text hover:bg-ns-sunken"
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add pair
        </button>
      )}
    </NsCard>
  );
}
