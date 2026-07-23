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
