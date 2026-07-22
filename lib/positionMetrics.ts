import type { Position, PositionMetrics } from "./types";

function weightedAvg(fills: { price: number; qty: number }[]): number {
  const totalQty = fills.reduce((a, f) => a + f.qty, 0);
  if (totalQty === 0) return 0;
  const totalCost = fills.reduce((a, f) => a + f.price * f.qty, 0);
  return totalCost / totalQty;
}

export function computePositionMetrics(position: Position, livePrice: number | null): PositionMetrics {
  const totalQtyEntered = position.entries.reduce((a, f) => a + f.qty, 0);
  const totalQtyExited = position.exits.reduce((a, f) => a + f.qty, 0);
  const openQty = totalQtyEntered - totalQtyExited;

  const avgEntryPrice = weightedAvg(position.entries);
  const avgExitPrice = position.exits.length > 0 ? weightedAvg(position.exits) : null;

  const costBasis = avgEntryPrice * openQty;
  const realizedPnl = position.exits.reduce((a, f) => a + (f.price - avgEntryPrice) * f.qty, 0);

  let unrealizedPnl: number | null = null;
  if (openQty > 0 && livePrice !== null) {
    unrealizedPnl = (livePrice - avgEntryPrice) * openQty;
  } else if (openQty <= 0) {
    unrealizedPnl = 0;
  }

  const totalPnl = unrealizedPnl !== null ? realizedPnl + unrealizedPnl : null;

  const totalCostBasis = avgEntryPrice * totalQtyEntered;
  const returnPct = totalPnl !== null && totalCostBasis > 0 ? totalPnl / totalCostBasis : null;

  const firstEntry = [...position.entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )[0];
  const lastExit =
    position.exits.length > 0
      ? [...position.exits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;

  const startTime = firstEntry ? new Date(firstEntry.date).getTime() : Date.now();
  const endTime = position.status === "closed" && lastExit ? new Date(lastExit.date).getTime() : Date.now();
  const daysHeld = Math.max(0, Math.round((endTime - startTime) / (1000 * 60 * 60 * 24)));

  return {
    avgEntryPrice,
    avgExitPrice,
    totalQtyEntered,
    totalQtyExited,
    openQty,
    costBasis,
    realizedPnl,
    unrealizedPnl,
    totalPnl,
    returnPct,
    daysHeld,
  };
}
