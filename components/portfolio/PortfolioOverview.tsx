"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { BandRaw } from "@/components/log/Band";
import { usePositionStore } from "@/store/usePositionStore";
import { useQuotes } from "@/hooks/useQuotes";
import { computeCashSummary } from "@/lib/cash";
import { computePositionsValue } from "@/lib/portfolio";
import { formatCurrency } from "@/lib/format";
import { latestFixToken } from "@/components/log/fix";

/**
 * The running balance: the log's opening entry. The total is the largest ink
 * on the page because it is the number the reader came for; cash and
 * positions are its two ruled sub-entries, not sibling tiles.
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
    <BandRaw label="On the books">
      <p
        key={fixToken}
        className="figure animate-fix-stamp text-[clamp(2.75rem,8vw,4.5rem)] font-semibold leading-[0.95] text-fg"
      >
        {display(total)}
      </p>
      <p className="stamp mt-2 text-fg-subtle">Cash + open positions</p>

      <dl className="mt-6 border-t border-rule">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-rule py-3">
          <dt className="stamp w-24 shrink-0 text-fg-subtle">Cash</dt>
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

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-rule py-3">
          <dt className="stamp w-24 shrink-0 text-fg-subtle">Positions</dt>
          <dd key={fixToken} className="figure animate-fix-stamp text-xl font-medium text-fg">{display(portfolio.positionsValue)}</dd>
          <span className="fix-stamp ml-auto text-[11px] text-fg-subtle">
            {openCount} open
            {portfolio.positionsWithoutPrice > 0 ? ` · ${portfolio.positionsWithoutPrice} pending quote` : ""}
          </span>
        </div>

        {/* The sheet says what it does not know. Day change needs a portfolio
            figure this app does not keep, so it is recorded as absent rather
            than left for the reader to assume. */}
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
          <dt className="stamp w-24 shrink-0 text-fg-subtle">Day change</dt>
          <dd className="figure text-sm text-fg-subtle">Not recorded</dd>
          <span className="fix-stamp ml-auto text-[11px] text-fg-subtle">
            Per-symbol only, on each entry below
          </span>
        </div>
      </dl>
    </BandRaw>
  );
}
