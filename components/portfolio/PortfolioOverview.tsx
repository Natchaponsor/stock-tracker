"use client";

import { useState } from "react";
import { Eye, EyeOff, Pencil, RefreshCw } from "lucide-react";
import { usePositionStore } from "@/store/usePositionStore";
import { formatPct, glyph } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useRefreshPrices } from "@/hooks/useRefreshPrices";
import { usePriceAge } from "@/hooks/usePriceAge";
import { usePortfolioSummary } from "@/hooks/usePortfolioSummary";
import { StartingCashForm } from "@/components/portfolio/StartingCashForm";
import { CurrencyFlip, displayRateLine } from "@/components/portfolio/CurrencyFlip";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";

/**
 * The dashboard's silk header. The portfolio total is the one hero number;
 * cash, positions and the change from starting capital sit under it in a
 * glass stat strip. Text on the silk stays white, so the change reads by its
 * glyph and sign here rather than by green or red.
 */
export function PortfolioOverview() {
  const hidePnl = usePositionStore((s) => s.hidePnl);
  const toggleHidePnl = usePositionStore((s) => s.toggleHidePnl);
  const { refresh, refreshing } = useRefreshPrices();
  const priceAge = usePriceAge();
  const summary = usePortfolioSummary();
  const { total, startingCash, capital, depositCount, openCount, changeFromCapital, changePct, fixToken } = summary;
  const [editing, setEditing] = useState(false);
  const money = useDisplayCurrency();
  const rateLine = displayRateLine(money);

  const display = (v: number) => (hidePnl ? "••••••" : money.money(v));
  const [whole, cents] = money.split(total);

  const contextLine = [
    `${openCount} open ${openCount === 1 ? "position" : "positions"}`,
    summary.positionsWithoutPrice > 0 ? `${summary.positionsWithoutPrice} at cost, no quote yet` : null,
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
        <div className="flex items-center justify-center gap-2">
          <h2 id="portfolio-heading" className="ns-label text-ns-on-hero-muted">
            Portfolio value
          </h2>
          <CurrencyFlip display={money} />
        </div>
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
        {rateLine && <p className="ns-caption mt-0.5 font-normal text-ns-on-hero-muted">{rateLine.full}</p>}
      </div>

      <dl className="oc-glass oc-num mx-auto mt-5 grid max-w-2xl grid-cols-3 py-3 text-center">
        <div className="min-w-0 px-1.5 sm:px-2">
          <dt className="ns-caption flex items-center justify-center gap-1 text-ns-on-hero-muted">
            Cash
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Adjust starting cash balance"
              className="-my-1 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:text-ns-on-primary focus-visible:outline-ns-on-primary"
            >
              <Pencil className="h-3 w-3" />
              <span className="sr-only">Adjust starting cash balance</span>
            </button>
          </dt>
          <dd className="mt-0.5 truncate text-[16px] leading-[22px] font-semibold sm:text-[18px] sm:leading-6 md:text-[20px] md:leading-[26px]">{display(summary.cash)}</dd>
          <dd className="ns-caption truncate font-normal text-ns-on-hero-muted">
            {depositCount > 0 ? `${money.money(capital)} put in` : `${money.money(startingCash)} start`}
          </dd>
        </div>

        <div className="min-w-0 border-x border-ns-glass-line px-1.5 sm:px-2">
          <dt className="ns-caption text-ns-on-hero-muted">Positions</dt>
          <dd key={fixToken} className="animate-fix-stamp mt-0.5 truncate text-[16px] leading-[22px] font-semibold sm:text-[18px] sm:leading-6 md:text-[20px] md:leading-[26px]">
            {display(summary.positionsValue)}
          </dd>
          <dd className="ns-caption font-normal text-ns-on-hero-muted">{openCount} open</dd>
        </div>

        <div className="min-w-0 px-1.5 sm:px-2">
          <dt className="ns-caption text-ns-on-hero-muted">Change</dt>
          <dd key={fixToken} className="animate-fix-stamp mt-0.5 truncate text-[16px] leading-[22px] font-semibold sm:text-[18px] sm:leading-6 md:text-[20px] md:leading-[26px]">
            <span aria-hidden="true" className="mr-1 text-[0.7em] align-[0.1em]">
              {glyph(changeFromCapital)}
            </span>
            {/* Compact past 10,000: the glyph and sign leave this cell the least room. */}
            {hidePnl ? "••••" : money.money(changeFromCapital, { signed: true, compact: true })}
          </dd>
          <dd className="ns-caption truncate font-normal text-ns-on-hero-muted">
            {changePct !== null
              ? `${hidePnl ? "••••" : formatPct(changePct, { signed: true })} total`
              : "No starting capital"}
          </dd>
        </div>
      </dl>

      {editing && <StartingCashForm onDone={() => setEditing(false)} className="mx-auto mt-3 max-w-2xl" />}
    </section>
  );
}
