"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { BandRaw } from "@/components/log/Band";
import { PnlText } from "@/components/ui/PnlText";
import { usePositionStore } from "@/store/usePositionStore";
import { useQuotes } from "@/hooks/useQuotes";
import { computeCashSummary } from "@/lib/cash";
import { computePositionsValue } from "@/lib/portfolio";
import { formatCurrency, formatPct } from "@/lib/format";
import { latestFixToken } from "@/components/log/fix";
import { AllocationChart } from "@/components/portfolio/AllocationChart";

const ROW = "flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3";
const LABEL = "stamp w-36 shrink-0 text-fg-subtle";

/**
 * The portfolio summary: the sheet's opening entry. The total is the largest ink
 * on the page because it is the number the reader came for; cash, positions and
 * the change from starting capital are its ruled sub-entries, set beside it
 * rather than stacked below it, and the allocation scale bar closes the entry.
 */
export function PortfolioOverview() {
  const startingCash = usePositionStore((s) => s.startingCash);
  const setStartingCash = usePositionStore((s) => s.setStartingCash);
  const positions = usePositionStore((s) => s.positions);
  const hidePnl = usePositionStore((s) => s.hidePnl);

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

  return (
    <BandRaw label="Portfolio summary">
      <div className="grid gap-x-10 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
        <div>
          <p
            key={fixToken}
            className="figure animate-fix-stamp text-[clamp(2.75rem,8vw,4.5rem)] font-semibold leading-[0.95] text-fg"
          >
            {display(total)}
          </p>
          <p className="stamp mt-2 text-fg-subtle">Cash + open positions</p>
        </div>

        <dl className="mt-6 border-t border-rule md:mt-0">
          <div className={`${ROW} border-b border-rule`}>
            <dt className={LABEL}>Cash</dt>
            {editing ? (
              <dd className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                  aria-label="Starting cash balance"
                  className="figure h-8 w-32 border border-rule-strong bg-panel px-2 text-sm text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                />
                <button
                  type="button"
                  onClick={saveStartingCash}
                  className="stamp h-8 bg-accent px-3 text-on-accent transition-colors hover:bg-accent-strong"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="stamp h-8 px-2 text-fg-muted transition-colors hover:text-fg"
                >
                  Cancel
                </button>
              </dd>
            ) : (
              <>
                <dd className="figure text-xl font-medium text-fg">{display(cashSummary.cash)}</dd>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(String(startingCash));
                    setEditing(true);
                  }}
                  className="flex h-6 w-6 items-center justify-center text-fg-subtle transition-colors hover:text-fg"
                  title="Adjust starting cash balance"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only">Adjust starting cash balance</span>
                </button>
                <span className="fix-stamp ml-auto text-[11px] text-fg-subtle">
                  {formatCurrency(startingCash)} starting
                </span>
              </>
            )}
          </div>

          <div className={`${ROW} border-b border-rule`}>
            <dt className={LABEL}>Positions</dt>
            <dd key={fixToken} className="figure animate-fix-stamp text-xl font-medium text-fg">
              {display(portfolio.positionsValue)}
            </dd>
            <span className="fix-stamp ml-auto text-[11px] text-fg-subtle">
              {openCount} open
              {portfolio.positionsWithoutPrice > 0 ? ` · ${portfolio.positionsWithoutPrice} pending quote` : ""}
            </span>
          </div>

          <div className={ROW}>
            <dt className={LABEL}>Change from capital</dt>
            <dd key={fixToken}>
              <PnlText
                value={changeFromCapital}
                formatted={formatCurrency(changeFromCapital, { signed: true })}
                className="figure animate-fix-stamp text-xl"
              />
            </dd>
            <span className="fix-stamp ml-auto text-[11px] text-fg-subtle">
              {changePct !== null
                ? `${hidePnl ? "••••" : formatPct(changePct, { signed: true })} vs ${formatCurrency(startingCash)} starting`
                : "No starting capital set"}
              {/* A held symbol with no quote yet is counted at cost, so say so
                  rather than let the figure look fully marked to market. */}
              {portfolio.positionsWithoutPrice > 0 ? ` · ${portfolio.positionsWithoutPrice} at cost` : ""}
            </span>
          </div>
        </dl>
      </div>

      {/* Where the money sits belongs with the balance it divides, not a band of its own. */}
      <div className="mt-6 border-t border-rule pt-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h3 className="stamp text-fg-subtle">Allocation</h3>
          <span className="fix-stamp text-[11px] text-fg-subtle">Cash + open positions</span>
        </div>
        <div className="pt-3">
          <AllocationChart />
        </div>
      </div>
    </BandRaw>
  );
}
