import type { CashDeposit, Position } from "./types";

export const DEFAULT_STARTING_CASH = 10000;

export interface CashSummary {
  startingCash: number;
  /** Every cash deposit, in dollars at the rate each one was logged with. */
  totalDeposited: number;
  /** What was put in: starting cash plus deposits. Gains are measured against this. */
  capital: number;
  totalBought: number;
  totalSold: number;
  cash: number;
}

/** A deposit's value in dollars, at the rate it was logged with. */
export function depositUsd(deposit: Pick<CashDeposit, "amount" | "rate">): number {
  return deposit.rate > 0 ? deposit.amount / deposit.rate : 0;
}

/**
 * Cash remaining = starting balance plus every deposit, minus every buy, plus
 * every sell, across all positions.
 */
export function computeCashSummary(
  startingCash: number,
  positions: Position[],
  deposits: CashDeposit[] = []
): CashSummary {
  let totalBought = 0;
  let totalSold = 0;

  for (const position of positions) {
    for (const fill of position.entries) totalBought += fill.price * fill.qty;
    for (const fill of position.exits) totalSold += fill.price * fill.qty;
  }

  const totalDeposited = deposits.reduce((sum, d) => sum + depositUsd(d), 0);
  const capital = startingCash + totalDeposited;

  return {
    startingCash,
    totalDeposited,
    capital,
    totalBought,
    totalSold,
    cash: capital - totalBought + totalSold,
  };
}
