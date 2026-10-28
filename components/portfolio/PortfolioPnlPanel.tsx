"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { NsCard, NsPnl, SymbolMark } from "@/components/navy/primitives";
import { usePositionStore } from "@/store/usePositionStore";
import { useQuotes } from "@/hooks/useQuotes";
import { computeCashSummary } from "@/lib/cash";
import { computePnlSummary, computeSymbolPnlBreakdown } from "@/lib/portfolio";
import { formatCurrency, formatPct } from "@/lib/format";
import { resolveSector } from "@/lib/sectors";
import { cn } from "@/lib/cn";
import { latestFixToken } from "@/components/log/fix";

/** P&L as a share of what those shares cost; null when nothing was spent on them. */
function pctOf(pnl: number | null, cost: number): number | null {
  return pnl !== null && cost > 0 ? pnl / cost : null;
}

/**
 * A % change as a small pill, styled like the watchlist's change badge
 * (green up, red down) but a size smaller so the amount beside it leads.
 */
function PctBadge({ value, className }: { value: number | null; className?: string }) {
  const hidePnl = usePositionStore((s) => s.hidePnl);
  if (value === null) return null;
  const kind = value === 0 ? "oc-badge-info" : value > 0 ? "oc-badge-up" : "oc-badge-down";
  return (
    <span className={cn("oc-badge oc-num gap-0.5! px-1.5! py-px! text-[10.5px]! leading-[14px]!", kind, className)}>
      {hidePnl ? "••••" : formatPct(value, { signed: true })}
    </span>
  );
}

/** One realized/unrealized bar, scaled against the larger of the two. Gains fill green, losses red. */
function PnlBar({ value, largest }: { value: number; largest: number }) {
  return (
    <div className="oc-track h-1.5!">
      <div
        className={cn("oc-fill", value >= 0 ? "bg-ns-success" : "bg-ns-danger")}
        style={{ width: `${largest > 0 ? Math.max(2, (Math.abs(value) / largest) * 100) : 0}%` }}
      />
    </div>
  );
}

/** A stock's share of the whole portfolio (cash included), in its sector's colour. */
function ShareBar({ share, color }: { share: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="oc-track h-1.5! min-w-0 flex-1" aria-hidden="true">
        <div className="oc-fill" style={{ width: `${share > 0 ? Math.max(2, share * 100) : 0}%`, background: color }} />
      </div>
      <span className="ns-caption oc-num w-10 shrink-0 text-right font-normal text-ns-ink-muted">
        {(share * 100).toFixed(1)}%
      </span>
    </div>
  );
}

const ROW_COLUMNS = "grid-cols-[minmax(0,1fr)_5.75rem_5.75rem] sm:grid-cols-[minmax(0,1fr)_8rem_7.5rem_7.5rem]";

export function PortfolioPnlPanel() {
  const positions = usePositionStore((s) => s.positions);
  const startingCash = usePositionStore((s) => s.startingCash);
  const customSectors = usePositionStore((s) => s.customSectors);
  // Open by default: the per-stock split is the reading most people come here for.
  const [expanded, setExpanded] = useState(true);

  const openSymbols = useMemo(
    () => Array.from(new Set(positions.filter((p) => p.status === "open").map((p) => p.symbol))),
    [positions]
  );
  const { quotes } = useQuotes(openSymbols);
  const summary = useMemo(() => computePnlSummary(positions, quotes), [positions, quotes]);
  const breakdown = useMemo(() => computeSymbolPnlBreakdown(positions, quotes), [positions, quotes]);
  const cash = useMemo(() => computeCashSummary(startingCash, positions).cash, [startingCash, positions]);
  // The same total the header shows: cash plus every open share at its live price.
  const portfolioTotal = cash + breakdown.reduce((sum, s) => sum + s.marketValue, 0);
  // Unrealized moves with the fix, so it re-stamps with it.
  const fixToken = latestFixToken(quotes);
  const largest = Math.max(Math.abs(summary.totalRealized), Math.abs(summary.totalUnrealized));
  const traded = summary.totalRealized !== 0 || summary.totalUnrealized !== 0;

  return (
    <NsCard title="Profit & loss" meta="Realized vs. still open">
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-ns-md bg-ns-sunken p-3">
          <dt className="ns-label text-ns-ink-muted">Realized</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <NsPnl
              value={summary.totalRealized}
              formatted={formatCurrency(summary.totalRealized, { signed: true })}
              className="ns-amount-md"
            />
            <PctBadge value={pctOf(summary.totalRealized, summary.realizedCost)} />
          </dd>
          {traded && (
            <dd className="mt-2">
              <PnlBar value={summary.totalRealized} largest={largest} />
            </dd>
          )}
        </div>
        <div className="rounded-ns-md bg-ns-sunken p-3">
          <dt className="ns-label text-ns-ink-muted">Unrealized</dt>
          <dd key={fixToken} className="animate-fix-stamp mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <NsPnl
              value={summary.totalUnrealized}
              formatted={formatCurrency(summary.totalUnrealized, { signed: true })}
              className="ns-amount-md"
            />
            <PctBadge value={pctOf(summary.totalUnrealized, summary.unrealizedCost)} />
          </dd>
          {traded && (
            <dd className="mt-2">
              <PnlBar value={summary.totalUnrealized} largest={largest} />
            </dd>
          )}
          {summary.positionsWithoutPrice > 0 && (
            <dd className="ns-caption mt-1.5 font-normal text-ns-ink-subtle">
              {summary.positionsWithoutPrice} pending quote
            </dd>
          )}
        </div>
      </dl>

      {breakdown.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="oc-link flex cursor-pointer items-center gap-1"
          >
            Breakdown by stock
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </button>

          {expanded && (
            <div className="mt-2">
              <div className={cn("ns-caption grid gap-x-2 border-b border-ns-line pb-2 text-ns-ink-subtle sm:gap-x-3", ROW_COLUMNS)}>
                <span>Stock</span>
                <span className="hidden sm:block">% Portfolio</span>
                <span className="text-center">Realized</span>
                <span className="text-center">Unrealized</span>
              </div>
              <ul>
                {breakdown.map((s) => {
                  const share = portfolioTotal > 0 ? s.marketValue / portfolioTotal : 0;
                  const color = resolveSector(s.symbol, customSectors).color;
                  return (
                    <li
                      key={s.symbol}
                      className={cn(
                        "grid items-center gap-x-2 border-b border-ns-line py-2.5 last:border-b-0 sm:gap-x-3",
                        ROW_COLUMNS
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <SymbolMark symbol={s.symbol} size={28} />
                        <p className="ns-body truncate font-semibold text-ns-ink">{s.symbol}</p>
                      </div>
                      <div className="hidden sm:block">
                        <ShareBar share={share} color={color} />
                      </div>
                      <div className="ns-label flex flex-col items-center text-center">
                        <NsPnl value={s.realizedPnl} formatted={formatCurrency(s.realizedPnl, { signed: true })} />
                        <PctBadge value={pctOf(s.realizedPnl, s.realizedCost)} className="mt-1" />
                      </div>
                      <div className="ns-label flex flex-col items-center text-center">
                        {s.unrealizedPnl !== null ? (
                          <>
                            <NsPnl
                              value={s.unrealizedPnl}
                              formatted={formatCurrency(s.unrealizedPnl, { signed: true })}
                            />
                            <PctBadge value={pctOf(s.unrealizedPnl, s.unrealizedCost)} className="mt-1" />
                          </>
                        ) : (
                          <span className="text-ns-ink-subtle">—</span>
                        )}
                      </div>
                      {/* Phones have no room for a share column, so the bar gets its own line. */}
                      <div className="col-span-3 mt-2 pl-[38px] sm:hidden">
                        <ShareBar share={share} color={color} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </NsCard>
  );
}
