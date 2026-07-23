import { computePositionMetrics } from "./positionMetrics";
import type { Position, Quote } from "./types";

export interface PortfolioSummary {
  positionsValue: number; // mark-to-market value of all open shares
  positionsWithoutPrice: number; // count of open positions missing a live quote
}

/** Mark-to-market value of every open position, falling back to avg entry price when no live quote yet. */
export function computePositionsValue(positions: Position[], quotes: Map<string, Quote>): PortfolioSummary {
  let positionsValue = 0;
  let positionsWithoutPrice = 0;

  for (const position of positions) {
    if (position.status !== "open") continue;
    const metrics = computePositionMetrics(position, null);
    if (metrics.openQty <= 0) continue;

    const quote = quotes.get(position.symbol);
    const price = quote?.price ?? null;
    if (price === null) positionsWithoutPrice += 1;

    positionsValue += (price ?? metrics.avgEntryPrice) * metrics.openQty;
  }

  return { positionsValue, positionsWithoutPrice };
}

export interface AllocationSlice {
  label: string;
  value: number;
  pct: number; // 0..1 share of total portfolio (cash + positions)
  isCash: boolean;
}

/** Portfolio breakdown by asset — cash plus one row per symbol (aggregated, in case of multiple positions in the same symbol). */
export function computeAllocation(cash: number, positions: Position[], quotes: Map<string, Quote>): AllocationSlice[] {
  const bySymbol = new Map<string, number>();

  for (const position of positions) {
    if (position.status !== "open") continue;
    const metrics = computePositionMetrics(position, null);
    if (metrics.openQty <= 0) continue;

    const price = quotes.get(position.symbol)?.price ?? metrics.avgEntryPrice;
    const value = price * metrics.openQty;
    bySymbol.set(position.symbol, (bySymbol.get(position.symbol) ?? 0) + value);
  }

  const total = cash + Array.from(bySymbol.values()).reduce((a, v) => a + v, 0);

  const slices: AllocationSlice[] = [
    { label: "Cash", value: cash, pct: total > 0 ? cash / total : 0, isCash: true },
    ...Array.from(bySymbol.entries()).map(([label, value]) => ({
      label,
      value,
      pct: total > 0 ? value / total : 0,
      isCash: false,
    })),
  ];

  return slices.sort((a, b) => b.value - a.value);
}
