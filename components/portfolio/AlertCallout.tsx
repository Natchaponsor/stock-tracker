"use client";

import { useState } from "react";
import Link from "next/link";
import { usePositionStore } from "@/store/usePositionStore";
import { usePortfolioSummary } from "@/hooks/usePortfolioSummary";
import { NsPnl, SymbolMark } from "@/components/navy/primitives";
import { formatCurrency, formatPct } from "@/lib/format";
import { formatAsOf } from "@/lib/priceTime";
import { useNow } from "@/components/log/clock";
import { cn } from "@/lib/cn";

const ROW = "flex items-baseline justify-between gap-4 border-t border-ns-line py-3";

/**
 * The one fuchsia call-out on the dashboard (Navy Stream AlertCallout): an open
 * position whose price has reached the stop or target set for it. Shows the
 * most urgent one and names the rest. Gains and losses inside stay green/red.
 * Dismissing hides an alert until the page reloads; it comes back while the
 * price is still past the level.
 */
export function AlertCallout({ className }: { className?: string }) {
  const { alerts } = usePortfolioSummary();
  const positions = usePositionStore((s) => s.positions);
  const strategies = usePositionStore((s) => s.strategies);
  const hidePnl = usePositionStore((s) => s.hidePnl);
  const now = useNow();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const open = alerts.filter((a) => !dismissed.includes(`${a.positionId}:${a.kind}`));
  if (open.length === 0) return null;
  const [alert, ...rest] = open;

  const position = positions.find((p) => p.id === alert.positionId);
  const exitRule = position?.strategyIds
    .map((id) => strategies.find((s) => s.id === id)?.exitRule)
    .find((rule): rule is string => Boolean(rule?.trim()));
  const isTarget = alert.kind === "target";

  return (
    <section
      id="needs-attention"
      aria-labelledby="needs-attention-heading"
      className={cn("oc-card oc-card-web oc-callout min-w-0 scroll-mt-6", className)}
    >
      <div className="oc-card-head">
        <span className="oc-badge oc-badge-accent">
          <span className="oc-dot" aria-hidden="true" />
          Needs your attention
        </span>
        {alert.asOf && (
          <span className="oc-sub oc-num">{formatAsOf(new Date(alert.asOf), now === null ? null : new Date(now))}</span>
        )}
      </div>

      <div className="flex items-center gap-3.5">
        <SymbolMark symbol={alert.symbol} size={44} />
        <div className="min-w-0">
          <h2 id="needs-attention-heading" className="text-[18px] leading-6 font-semibold text-ns-ink">
            {alert.symbol} {isTarget ? "hit your target" : "fell to your stop"}
          </h2>
          <p className="oc-sub oc-num text-[13px]!">
            {isTarget ? "Target" : "Stop"} {formatCurrency(alert.level)} · now {formatCurrency(alert.price)}
          </p>
        </div>
      </div>

      <dl className="ns-body oc-num mt-3.5 text-[14px]!">
        <div className={ROW}>
          <dt className="text-ns-ink-muted">Your entry</dt>
          <dd className="font-semibold text-ns-ink">{formatCurrency(alert.avgEntryPrice)}</dd>
        </div>
        <div className={ROW}>
          <dt className="text-ns-ink-muted">{alert.pnl >= 0 ? "Gain" : "Loss"} if you sell</dt>
          <dd className="font-semibold">
            <NsPnl
              value={alert.pnl}
              showGlyph={false}
              formatted={`${formatCurrency(alert.pnl, { signed: true })}${
                alert.pnlPct !== null && !hidePnl ? ` (${formatPct(alert.pnlPct, { signed: true })})` : ""
              }`}
            />
          </dd>
        </div>
        <div className={ROW}>
          <dt className="shrink-0 text-ns-ink-muted">{exitRule ? "Exit rule" : "Shares"}</dt>
          <dd className="min-w-0 text-right font-semibold text-ns-ink">
            {exitRule ? <span className="line-clamp-2">{exitRule}</span> : `${alert.openQty} sh`}
          </dd>
        </div>
      </dl>

      <Link href={`/positions/${alert.positionId}`} className="oc-btn oc-btn-accent oc-btn-block mt-3.5 no-underline">
        Review trade
      </Link>
      <button
        type="button"
        onClick={() => setDismissed((d) => [...d, `${alert.positionId}:${alert.kind}`])}
        className="oc-btn oc-btn-secondary oc-btn-block mt-2.5 py-[11px]!"
      >
        Dismiss for now
      </button>

      {rest.length > 0 && (
        <p className="oc-sub mt-3 text-center">
          Also past a level: {rest.map((a) => `${a.symbol} (${a.kind})`).join(", ")}
        </p>
      )}
    </section>
  );
}
