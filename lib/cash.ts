import type { Position } from "./types";

export const DEFAULT_STARTING_CASH = 10000;

export interface CashSummary {
  startingCash: number;
  totalBought: number;
  totalSold: number;
  cash: number;
}

/** Cash remaining = starting balance, minus every buy, plus every sell, across all positions. */
export function computeCashSummary(startingCash: number, positions: Position[]): CashSummary {
  let totalBought = 0;
  let totalSold = 0;

  for (const position of positions) {
    for (const fill of position.entries) totalBought += fill.price * fill.qty;
    for (const fill of position.exits) totalSold += fill.price * fill.qty;
  }

  return {
    startingCash,
    totalBought,
    totalSold,
    cash: startingCash - totalBought + totalSold,
  };
}
