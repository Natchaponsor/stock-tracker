import { computePositionMetrics } from "./positionMetrics";
import type { Position } from "./types";

export interface LedgerRow {
  /** Unique across positions: `${positionId}:${fillId}`. */
  key: string;
  positionId: string;
  symbol: string;
  kind: "buy" | "sell";
  date: string; // ISO
  qty: number;
  /** Entry price for a buy, selling price for a sell. */
  price: number;
  /**
   * Buy: unrealized P&L on the part of this buy still held. Sell: realized P&L
   * on the sale. null when it cannot be known (buy with no live quote yet, or
   * with nothing left held).
   */
  pnl: number | null;
  /** Buy: price now vs. entry. Sell: selling price vs. the position's average entry. */
  returnPct: number | null;
  /** Buy rows only: none of the position is held any more, so nothing is unrealized. */
  soldOut: boolean;
}

/**
 * Every buy and sell across every position, newest first — the recorded log.
 *
 * P&L follows the same average-cost method as `computePositionMetrics`, so the
 * rows add up to the Profit & Loss figures instead of contradicting them:
 *  - a sell's realized P&L is (selling price - position average entry) x qty,
 *    which sums to the position's realized P&L;
 *  - a buy's unrealized P&L is (price now - its entry price) x qty, scaled by
 *    the fraction of the position still held (average cost treats every share
 *    sold as an equal mix of all the buys), which sums to the position's
 *    unrealized P&L.
 *
 * `prices` maps a symbol to its latest price; a missing or null entry means no
 * live quote yet.
 */
export function buildLedger(positions: Position[], prices: Map<string, number | null>): LedgerRow[] {
  const rows: LedgerRow[] = [];

  for (const position of positions) {
    const price = prices.get(position.symbol) ?? null;
    const metrics = computePositionMetrics(position, price);
    const soldOut = metrics.openQty <= 0;
    const heldFraction =
      metrics.totalQtyEntered > 0 ? Math.min(1, Math.max(0, metrics.openQty / metrics.totalQtyEntered)) : 0;

    for (const fill of position.entries) {
      const known = !soldOut && price !== null;
      rows.push({
        key: `${position.id}:${fill.id}`,
        positionId: position.id,
        symbol: position.symbol,
        kind: "buy",
        date: fill.date,
        qty: fill.qty,
        price: fill.price,
        pnl: known ? (price - fill.price) * fill.qty * heldFraction : null,
        returnPct: known && fill.price > 0 ? price / fill.price - 1 : null,
        soldOut,
      });
    }

    for (const fill of position.exits) {
      rows.push({
        key: `${position.id}:${fill.id}`,
        positionId: position.id,
        symbol: position.symbol,
        kind: "sell",
        date: fill.date,
        qty: fill.qty,
        price: fill.price,
        pnl: (fill.price - metrics.avgEntryPrice) * fill.qty,
        returnPct: metrics.avgEntryPrice > 0 ? fill.price / metrics.avgEntryPrice - 1 : null,
        soldOut: false,
      });
    }
  }

  return rows.sort((a, b) => {
    const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (byDate !== 0) return byDate;
    // Same day: the sale came after the buy it closes out, so it reads first, newest-first.
    if (a.kind !== b.kind) return a.kind === "sell" ? -1 : 1;
    return a.symbol.localeCompare(b.symbol) || a.key.localeCompare(b.key);
  });
}
