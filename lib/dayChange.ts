import { computePositionMetrics } from "./positionMetrics";
import type { Position, Quote } from "./types";

export interface DayChange {
  /** Dollar move of every open share since the previous close; null with no quoted holdings. */
  amount: number | null;
  /** `amount` against what those shares were worth at the previous close. */
  pct: number | null;
}

/**
 * Today's move of the open book. A quote's `changePct` is today's percent
 * change (e.g. 1.5 for +1.5%), so the previous close is price / (1 + pct/100).
 * Holdings without a price or a change are left out rather than counted flat.
 */
export function computeDayChange(positions: Position[], quotes: Map<string, Quote>): DayChange {
  let amount = 0;
  let previous = 0;
  let counted = 0;

  for (const position of positions) {
    if (position.status !== "open") continue;
    const quote = quotes.get(position.symbol);
    if (!quote || quote.price === null || quote.changePct === null) continue;
    const { openQty } = computePositionMetrics(position, quote.price);
    if (openQty <= 0) continue;
    const prevClose = quote.price / (1 + quote.changePct / 100);
    amount += (quote.price - prevClose) * openQty;
    previous += prevClose * openQty;
    counted += 1;
  }

  if (counted === 0) return { amount: null, pct: null };
  return { amount, pct: previous > 0 ? amount / previous : null };
}

/** The tracked symbol (held or watched) up the most today, if any quote has a change. */
export function bestMover(quotes: Map<string, Quote>): { symbol: string; changePct: number } | null {
  let best: { symbol: string; changePct: number } | null = null;
  for (const quote of quotes.values()) {
    if (quote.changePct === null || quote.price === null) continue;
    if (best === null || quote.changePct > best.changePct) best = { symbol: quote.symbol, changePct: quote.changePct };
  }
  return best;
}
