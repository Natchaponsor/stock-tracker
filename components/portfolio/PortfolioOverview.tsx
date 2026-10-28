"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, Pencil, RefreshCw } from "lucide-react";
import { usePositionStore } from "@/store/usePositionStore";
import { useQuotes } from "@/hooks/useQuotes";
import { computeCashSummary } from "@/lib/cash";
import { computePositionsValue } from "@/lib/portfolio";
import { formatCurrency, formatPct, glyph } from "@/lib/format";
import { formatAgo, formatAsOf } from "@/lib/priceTime";
import { cn } from "@/lib/cn";
import { useNow } from "@/components/log/clock";
import { latestFixToken } from "@/components/log/fix";
import { useRefreshPrices } from "@/hooks/useRefreshPrices";

const NO_EXTRA_SYMBOLS: string[] = [];

/** "$12,480.25" → ["$12,480", ".25"], so the cents can fade back on the silk. */
function splitCents(value: number): [string, string] {
  const text = value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const dot = text.lastIndexOf(".");
  return dot === -1 ? [text, ""] : [text.slice(0, dot), text.slice(dot)];
}

/** How old the prices are, in plain words, for the header's glass pill. */
function usePriceAge() {
  const { quotes, isLoading, hasError } = useQuotes(NO_EXTRA_SYMBOLS);
  const now = useNow();

  let latest: number | null = null;
  for (const quote of quotes.values()) {
    if (quote.price === null || !quote.asOf) continue;
    const t = new Date(quote.asOf).getTime();
    if (Number.isFinite(t) && (latest === null || t > latest)) latest = t;
  }

  if (latest !== null) {
    const asOf = formatAsOf(new Date(latest), now === null ? null : new Date(now));
    const age = now === null ? "" : ` · ${formatAgo(now - latest)}`;
    return { text: `Prices as of ${asOf}${age}`, short: `As of ${asOf}${age}`, title: new Date(latest).toLocaleString() };
  }
  if (hasError) return { text: "Prices unavailable" };
  if (isLoading && quotes.size === 0) return { text: "Loading prices…" };
  if (quotes.size === 0) return { text: "No stocks to price yet" };
  return { text: "Waiting for prices" };
}

/**
 * The dashboard's silk header. The portfolio total is the one hero number;
 * cash, positions and the change from starting capital sit under it in a
 * glass stat strip. Text on the silk stays white, so the change reads by its
 * glyph and sign here rather than by green or red.
 */
export function PortfolioOverview() {
  const startingCash = usePositionStore((s) => s.startingCash);
  const setStartingCash = usePositionStore((s) => s.setStartingCash);
  const positions = usePositionStore((s) => s.positions);
  const hidePnl = usePositionStore((s) => s.hidePnl);
  const toggleHidePnl = usePositionStore((s) => s.toggleHidePnl);
  const { refresh, refreshing } = useRefreshPrices();
  const priceAge = usePriceAge();

  const openSymbols = useMemo(
    () => Array.from(new Set(positions.filter((p) => p.status === "open").map((p) => p.symbol))),
    [positions]
  );
  const { quotes } = useQuotes(openSymbols);

  const cashSummary = useMemo(() => computeCashSummary(startingCash, positions), [startingCash, positions]);
  const portfolio = useMemo(() => computePositionsValue(positions, quotes), [positions, quotes]);
  const total = cashSummary.cash + portfolio.positionsValue;
  const openCount = positions.filter((p) => p.status === "open").length;
  // Change from capital: today's balance against the cash you started with.
  // That difference is everything realized plus everything still open.
  const changeFromCapital = total - startingCash;
  const changePct = startingCash > 0 ? changeFromCapital / startingCash : null;
  // Re-stamps these figures when a new fix lands.
  const fixToken = latestFixToken(quotes);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(startingCash));

  function saveStartingCash() {
    const amount = parseFloat(draft);
    if (Number.isFinite(amount)) setStartingCash(amount);
    setEditing(false);
  }

  const display = (v: number) => (hidePnl ? "••••••" : formatCurrency(v));
  const [whole, cents] = splitCents(total);

  const contextLine = [
    `${openCount} open ${openCount === 1 ? "position" : "positions"}`,
    portfolio.positionsWithoutPrice > 0 ? `${portfolio.positionsWithoutPrice} at cost, no quote yet` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-labelledby="portfolio-heading" className="oc-silk rounded-ns-xl px-5 pt-5 pb-14 md:px-8 md:pt-6">
      <div className="flex items-center justify-between gap-3">
        <p className="oc-glass ns-label min-w-0 truncate rounded-full! px-3.5 py-1.5" title={priceAge.title}>
          {priceAge.short ? (
            <>
              <span className="sm:hidden">{priceAge.short}</span>
              <span className="hidden sm:inline">{priceAge.text}</span>
            </>
          ) : (
            priceAge.text
          )}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleHidePnl}
            aria-pressed={hidePnl}
            title={hidePnl ? "Show amounts" : "Hide amounts (privacy mode)"}
            className="oc-icon-btn cursor-pointer focus-visible:outline-ns-on-primary"
          >
            {hidePnl ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            <span className="sr-only">{hidePnl ? "Show amounts" : "Hide amounts"}</span>
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            title="Fetch current prices now. Nothing refreshes automatically."
            className="oc-icon-btn cursor-pointer disabled:opacity-60 focus-visible:outline-ns-on-primary"
          >
            <RefreshCw className={cn("h-[18px] w-[18px]", refreshing && "animate-spin")} />
            <span className="sr-only">{refreshing ? "Refreshing prices" : "Refresh prices"}</span>
          </button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <h2 id="portfolio-heading" className="ns-label text-ns-on-hero-muted">
          Portfolio value
        </h2>
        <p key={fixToken} className="ns-amount-xl oc-num animate-fix-stamp mt-1 md:text-[56px] md:leading-[64px]">
          {hidePnl ? (
            "••••••"
          ) : (
            <>
              {whole}
              <span className="oc-decimals">{cents}</span>
            </>
          )}
        </p>
        <p className="ns-caption mt-1 text-ns-on-hero-muted">Cash + open positions · {contextLine}</p>
      </div>

      <dl className="oc-glass oc-num mx-auto mt-5 grid max-w-2xl grid-cols-3 py-3 text-center">
        <div className="min-w-0 px-1.5 sm:px-2">
          <dt className="ns-caption flex items-center justify-center gap-1 text-ns-on-hero-muted">
            Cash
            <button
              type="button"
              onClick={() => {
                setDraft(String(startingCash));
                setEditing(true);
              }}
              title="Adjust starting cash balance"
              className="-my-1 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:text-ns-on-primary focus-visible:outline-ns-on-primary"
            >
              <Pencil className="h-3 w-3" />
              <span className="sr-only">Adjust starting cash balance</span>
            </button>
          </dt>
          <dd className="mt-0.5 truncate text-[16px] leading-[22px] font-semibold sm:text-[18px] sm:leading-6 md:text-[20px] md:leading-[26px]">{display(cashSummary.cash)}</dd>
          <dd className="ns-caption truncate font-normal text-ns-on-hero-muted">
            {formatCurrency(startingCash)} start
          </dd>
        </div>

        <div className="min-w-0 border-x border-ns-glass-line px-1.5 sm:px-2">
          <dt className="ns-caption text-ns-on-hero-muted">Positions</dt>
          <dd key={fixToken} className="animate-fix-stamp mt-0.5 truncate text-[16px] leading-[22px] font-semibold sm:text-[18px] sm:leading-6 md:text-[20px] md:leading-[26px]">
            {display(portfolio.positionsValue)}
          </dd>
          <dd className="ns-caption font-normal text-ns-on-hero-muted">{openCount} open</dd>
        </div>

        <div className="min-w-0 px-1.5 sm:px-2">
          <dt className="ns-caption text-ns-on-hero-muted">Change</dt>
          <dd key={fixToken} className="animate-fix-stamp mt-0.5 truncate text-[16px] leading-[22px] font-semibold sm:text-[18px] sm:leading-6 md:text-[20px] md:leading-[26px]">
            <span aria-hidden="true" className="mr-1 text-[0.7em] align-[0.1em]">
              {glyph(changeFromCapital)}
            </span>
            {hidePnl ? "••••" : formatCurrency(changeFromCapital, { signed: true })}
          </dd>
          <dd className="ns-caption truncate font-normal text-ns-on-hero-muted">
            {changePct !== null
              ? `${hidePnl ? "••••" : formatPct(changePct, { signed: true })} total`
              : "No starting capital"}
          </dd>
        </div>
      </dl>

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveStartingCash();
          }}
          className="oc-glass mx-auto mt-3 flex max-w-2xl flex-wrap items-center gap-2 p-2"
        >
          <label htmlFor="starting-cash" className="ns-label px-2 text-ns-on-hero-muted">
            Starting cash
          </label>
          <input
            id="starting-cash"
            type="number"
            step="0.01"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            className="ns-body oc-num h-10 min-w-0 flex-1 rounded-ns-sm border border-ns-glass-line bg-ns-glass px-3 text-ns-on-primary placeholder:text-ns-on-hero-muted focus-visible:outline-2 focus-visible:outline-ns-on-primary"
          />
          <button type="submit" className="oc-btn bg-ns-card px-4! py-2.5! text-ns-primary-text">
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="oc-btn bg-transparent px-3! py-2.5! text-ns-on-primary"
          >
            Cancel
          </button>
        </form>
      )}
    </section>
  );
}
