"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { usePositionStore } from "@/store/usePositionStore";
import { usePortfolioSummary } from "@/hooks/usePortfolioSummary";
import { formatPct, glyph } from "@/lib/format";
import { cn } from "@/lib/cn";
import { StartingCashForm } from "@/components/portfolio/StartingCashForm";
import { CurrencyFlip, displayRateLine } from "@/components/portfolio/CurrencyFlip";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";

const STAT_LABEL = "text-[12px] leading-4 font-medium text-ns-on-hero-muted";
const STAT_VALUE = "my-1 truncate text-[22px] leading-7 font-semibold";
const STAT_SUB = "truncate text-[12px] leading-4 text-ns-on-hero-muted";

/**
 * The web dashboard's silk banner (Navy Stream SummaryBanner): the portfolio
 * value large on the left with today's move and any alerts as glass chips,
 * and a four-stat glass strip on the right. Text on the silk stays white, so
 * moves read by glyph and sign; the alert chip's ringed dot is the only pink.
 */
export function SummaryBanner({ className }: { className?: string }) {
  const hidePnl = usePositionStore((s) => s.hidePnl);
  const summary = usePortfolioSummary();
  const {
    total,
    cash,
    startingCash,
    capital,
    depositCount,
    positionsValue,
    openCount,
    changeFromCapital,
    changePct,
    day,
    best,
    alerts,
    fixToken,
  } = summary;
  const [editing, setEditing] = useState(false);
  const money = useDisplayCurrency();
  const formatCurrency = money.money;
  const rateLine = displayRateLine(money);
  const [whole, cents] = money.split(total);
  const hide = (text: string) => (hidePnl ? "••••" : text);

  return (
    <section aria-labelledby="banner-heading" className={cn("oc-silk oc-banner", className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 id="banner-heading" className="text-[15px] leading-5 font-medium text-ns-on-hero-muted">
            Portfolio value
          </h2>
          <CurrencyFlip display={money} />
        </div>
        <p key={fixToken} className="ns-amount-web oc-num animate-fix-stamp mt-1.5 mb-2.5">
          {hidePnl ? (
            "••••••"
          ) : (
            <>
              {whole}
              <span className="oc-decimals">{cents}</span>
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2.5">
          {day.amount !== null ? (
            <>
              <span className="oc-banner-chip oc-num">
                <span aria-hidden="true" className="text-[0.75em]">
                  {glyph(day.amount)}
                </span>
                {hide(formatCurrency(day.amount, { signed: true }))} today
              </span>
              {day.pct !== null && (
                <span className="oc-banner-chip oc-num">{hide(formatPct(day.pct, { signed: true, decimals: 2 }))}</span>
              )}
            </>
          ) : (
            <span className="oc-banner-chip">Cash + open positions</span>
          )}
          {rateLine && (
            <span className="oc-banner-chip font-medium" title={rateLine.full}>
              {rateLine.short}
            </span>
          )}
          {alerts.length > 0 && (
            <a href="#needs-attention" className="oc-banner-chip text-ns-on-primary no-underline">
              <span className="oc-dot" aria-hidden="true" />
              {alerts.length} {alerts.length === 1 ? "alert" : "alerts"}
            </a>
          )}
        </div>
      </div>

      <dl className="oc-glass oc-banner-stats oc-num">
        <div className="min-w-0 px-2">
          <dt className={cn(STAT_LABEL, "flex items-center justify-center gap-1")}>
            Cash
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Adjust starting cash balance"
              className="-my-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-colors hover:text-ns-on-primary focus-visible:outline-ns-on-primary"
            >
              <Pencil className="h-3 w-3" />
              <span className="sr-only">Adjust starting cash balance</span>
            </button>
          </dt>
          <dd className={STAT_VALUE}>{hide(formatCurrency(cash))}</dd>
          <dd className={STAT_SUB}>{total > 0 ? `${((cash / total) * 100).toFixed(0)}% of total` : depositCount > 0 ? `${formatCurrency(capital)} put in` : `${formatCurrency(startingCash)} start`}</dd>
        </div>
        <div className="min-w-0 px-2">
          <dt className={STAT_LABEL}>Positions</dt>
          <dd key={fixToken} className={cn(STAT_VALUE, "animate-fix-stamp")}>
            {hide(formatCurrency(positionsValue))}
          </dd>
          <dd className={STAT_SUB}>{openCount} open</dd>
        </div>
        <div className="min-w-0 px-2">
          <dt className={STAT_LABEL}>Since start</dt>
          <dd key={fixToken} className={cn(STAT_VALUE, "animate-fix-stamp")}>
            <span aria-hidden="true" className="mr-1 text-[0.7em] align-[0.1em]">
              {glyph(changeFromCapital)}
            </span>
            {hide(formatCurrency(changeFromCapital, { signed: true }))}
          </dd>
          <dd className={STAT_SUB}>
            {changePct !== null ? hide(formatPct(changePct, { signed: true })) : "No starting capital"}
          </dd>
        </div>
        <div className="min-w-0 px-2">
          <dt className={STAT_LABEL}>Best today</dt>
          <dd className={STAT_VALUE}>{best ? best.symbol : "—"}</dd>
          <dd className={STAT_SUB}>
            {best ? `${best.changePct > 0 ? "+" : best.changePct < 0 ? "−" : ""}${Math.abs(best.changePct).toFixed(2)}%` : "No moves yet"}
          </dd>
        </div>
      </dl>

      {editing && <StartingCashForm onDone={() => setEditing(false)} className="col-span-full" />}
    </section>
  );
}
