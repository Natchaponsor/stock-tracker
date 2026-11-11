import { computePositionMetrics } from "./positionMetrics";
import type { Position, Quote } from "./types";

export type AlertKind = "stop" | "target";

/** An open position whose live price has reached the level the user set for it. */
export interface PositionAlert {
  positionId: string;
  symbol: string;
  kind: AlertKind;
  /** The stop or target price that was reached. */
  level: number;
  price: number;
  asOf: string | null;
  avgEntryPrice: number;
  openQty: number;
  /** What selling every open share at `price` would realize. */
  pnl: number;
  pnlPct: number | null;
}

/**
 * Open positions that need action now: price at or under the stop, or at or
 * over the target. Stops come first (they protect capital), then whichever
 * level the price has run furthest past. Positions without a live quote, a
 * level, or shares left are skipped.
 */
export function computeAlerts(positions: Position[], quotes: Map<string, Quote>): PositionAlert[] {
  const alerts: (PositionAlert & { overshoot: number })[] = [];

  for (const position of positions) {
    if (position.status !== "open") continue;
    const price = quotes.get(position.symbol)?.price ?? null;
    if (price === null) continue;
    const metrics = computePositionMetrics(position, price);
    if (metrics.openQty <= 0) continue;

    let kind: AlertKind | null = null;
    let level = 0;
    if (position.stop !== null && price <= position.stop) {
      kind = "stop";
      level = position.stop;
    } else if (position.target !== null && price >= position.target) {
      kind = "target";
      level = position.target;
    }
    if (kind === null) continue;

    const pnl = (price - metrics.avgEntryPrice) * metrics.openQty;
    alerts.push({
      positionId: position.id,
      symbol: position.symbol,
      kind,
      level,
      price,
      asOf: quotes.get(position.symbol)?.asOf ?? null,
      avgEntryPrice: metrics.avgEntryPrice,
      openQty: metrics.openQty,
      pnl,
      pnlPct: metrics.costBasis > 0 ? pnl / metrics.costBasis : null,
      overshoot: level > 0 ? Math.abs(price - level) / level : 0,
    });
  }

  alerts.sort((a, b) => (a.kind === b.kind ? b.overshoot - a.overshoot : a.kind === "stop" ? -1 : 1));
  return alerts.map((entry) => {
    const alert: PositionAlert & { overshoot?: number } = { ...entry };
    delete alert.overshoot;
    return alert;
  });
}
