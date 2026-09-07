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

export interface PnlSummary {
  totalRealized: number; // realized P&L across every position, open or closed
  totalUnrealized: number; // unrealized P&L across open positions with a live quote
  positionsWithoutPrice: number; // count of open positions (with shares left) missing a live quote
}

/** Portfolio-wide realized vs. unrealized P&L, aggregated across every position. */
export function computePnlSummary(positions: Position[], quotes: Map<string, Quote>): PnlSummary {
  let totalRealized = 0;
  let totalUnrealized = 0;
  let positionsWithoutPrice = 0;

  for (const position of positions) {
    const price = quotes.get(position.symbol)?.price ?? null;
    const metrics = computePositionMetrics(position, price);
    totalRealized += metrics.realizedPnl;
    if (metrics.openQty > 0) {
      if (metrics.unrealizedPnl === null) positionsWithoutPrice += 1;
      else totalUnrealized += metrics.unrealizedPnl;
    }
  }

  return { totalRealized, totalUnrealized, positionsWithoutPrice };
}

export interface SymbolPnl {
  symbol: string;
  realizedPnl: number; // summed across every position in this symbol, open or closed
  unrealizedPnl: number | null; // null only when there are open shares but no live quote yet
  openQty: number;
}

/** Realized vs. unrealized P&L broken down per symbol, for expanding the portfolio-wide total. */
export function computeSymbolPnlBreakdown(positions: Position[], quotes: Map<string, Quote>): SymbolPnl[] {
  const bySymbol = new Map<string, Position[]>();
  for (const position of positions) {
    const list = bySymbol.get(position.symbol) ?? [];
    list.push(position);
    bySymbol.set(position.symbol, list);
  }

  const result: SymbolPnl[] = [];
  for (const [symbol, symbolPositions] of bySymbol) {
    const price = quotes.get(symbol)?.price ?? null;
    let realizedPnl = 0;
    let unrealizedPnl = 0;
    let openQty = 0;
    let hasOpenShares = false;

    for (const position of symbolPositions) {
      const metrics = computePositionMetrics(position, price);
      realizedPnl += metrics.realizedPnl;
      openQty += metrics.openQty;
      if (metrics.openQty > 0) {
        hasOpenShares = true;
        if (metrics.unrealizedPnl !== null) unrealizedPnl += metrics.unrealizedPnl;
      }
    }

    result.push({
      symbol,
      realizedPnl,
      unrealizedPnl: hasOpenShares && price === null ? null : unrealizedPnl,
      openQty,
    });
  }

  return result.sort(
    (a, b) => Math.abs(b.realizedPnl) + Math.abs(b.unrealizedPnl ?? 0) - (Math.abs(a.realizedPnl) + Math.abs(a.unrealizedPnl ?? 0))
  );
}

export interface FifoAllocation {
  positionId: string;
  qty: number;
  willFullyClose: boolean;
}

/**
 * Decides how many shares to take from each open lot (position) of the same symbol to
 * satisfy a sell, oldest lot first (FIFO) — so the user picks a symbol and a quantity,
 * not which specific position/lot to sell from. Returns null if there aren't enough
 * open shares across every lot combined to cover the requested quantity.
 */
export function allocateFifoSell(openLotsOfSymbol: Position[], qtyToSell: number): FifoAllocation[] | null {
  if (qtyToSell <= 0) return null;

  const firstEntryTime = (p: Position) =>
    p.entries.length > 0 ? Math.min(...p.entries.map((f) => new Date(f.date).getTime())) : Infinity;

  const lots = openLotsOfSymbol
    .map((position) => ({ position, openQty: computePositionMetrics(position, null).openQty }))
    .filter((lot) => lot.openQty > 0)
    .sort((a, b) => firstEntryTime(a.position) - firstEntryTime(b.position));

  const totalAvailable = lots.reduce((a, lot) => a + lot.openQty, 0);
  if (qtyToSell > totalAvailable) return null;

  const allocations: FifoAllocation[] = [];
  let remaining = qtyToSell;
  for (const lot of lots) {
    if (remaining <= 0) break;
    const take = Math.min(lot.openQty, remaining);
    allocations.push({ positionId: lot.position.id, qty: take, willFullyClose: take === lot.openQty });
    remaining -= take;
  }
  return allocations;
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
