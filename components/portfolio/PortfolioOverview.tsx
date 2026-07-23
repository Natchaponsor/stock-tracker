"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { usePositionStore } from "@/store/usePositionStore";
import { useQuotes } from "@/hooks/useQuotes";
import { computeCashSummary } from "@/lib/cash";
import { computePositionsValue } from "@/lib/portfolio";
import { formatCurrency } from "@/lib/format";

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

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(startingCash));

  function saveStartingCash() {
    const amount = parseFloat(draft);
    if (Number.isFinite(amount)) setStartingCash(amount);
    setEditing(false);
  }

  const display = (v: number) => (hidePnl ? "••••" : formatCurrency(v));

  return (
    <Card>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Cash</p>
            {!editing && (
              <button
                type="button"
                onClick={() => {
                  setDraft(String(startingCash));
                  setEditing(true);
                }}
                className="text-fg-subtle hover:text-fg"
                title="Adjust starting cash balance"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.01"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                className="h-8 w-28 rounded-lg border border-border bg-panel px-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <Button size="sm" variant="primary" onClick={saveStartingCash}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <p className="font-serif text-2xl font-medium text-fg">{display(cashSummary.cash)}</p>
              <p className="text-[11px] text-fg-subtle">{formatCurrency(startingCash)} starting balance</p>
            </>
          )}
        </div>

        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Positions</p>
          <p className="font-serif text-2xl font-medium text-fg">{display(portfolio.positionsValue)}</p>
          <p className="text-[11px] text-fg-subtle">
            {positions.filter((p) => p.status === "open").length} open
            {portfolio.positionsWithoutPrice > 0 ? ` · ${portfolio.positionsWithoutPrice} pending quote` : ""}
          </p>
        </div>

        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Total portfolio</p>
          <p className="font-serif text-2xl font-medium text-accent">{display(total)}</p>
          <p className="text-[11px] text-fg-subtle">Cash + open positions</p>
        </div>
      </div>
    </Card>
  );
}
