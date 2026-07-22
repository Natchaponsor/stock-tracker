import type { CrossSignal, CrossType, DailyBar } from "./types";

/**
 * Exponential moving average. Seeds with the SMA of the first `period` closes
 * (when available) rather than the first close alone, so the early values
 * aren't skewed by a single noisy print.
 */
export function ema(closes: number[], period: number): number[] {
  if (closes.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = new Array(closes.length);

  const seedLen = Math.min(period, closes.length);
  const seed = closes.slice(0, seedLen).reduce((a, b) => a + b, 0) / seedLen;

  let prev = seed;
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      out[i] = seed;
    } else {
      prev = closes[i] * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

export interface Macd {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function macd(closes: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): Macd {
  const fast = ema(closes, fastPeriod);
  const slow = ema(closes, slowPeriod);
  const macdLine = fast.map((v, i) => v - slow[i]);
  const signalLine = ema(macdLine, signalPeriod);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macd: macdLine, signal: signalLine, histogram };
}

/** Finds every point where `fast` crosses `slow` — golden (up) or death (down). */
export function findCrosses(fast: number[], slow: number[], bars: DailyBar[]): CrossSignal[] {
  const crosses: CrossSignal[] = [];
  for (let i = 1; i < fast.length; i++) {
    const prevDiff = fast[i - 1] - slow[i - 1];
    const diff = fast[i] - slow[i];
    if (prevDiff <= 0 && diff > 0) {
      crosses.push({ type: "golden-cross", date: bars[i].date, index: i });
    } else if (prevDiff >= 0 && diff < 0) {
      crosses.push({ type: "death-cross", date: bars[i].date, index: i });
    }
  }
  return crosses;
}

export interface TrendState {
  latestCross: CrossSignal | null;
  fastAboveSlow: boolean;
  priceAboveSlow: boolean;
}

/** Current trend read: most recent cross plus where price sits relative to the slow EMA. */
export function computeTrendState(closes: number[], bars: DailyBar[], fastPeriod = 50, slowPeriod = 200): TrendState {
  if (closes.length === 0) {
    return { latestCross: null, fastAboveSlow: false, priceAboveSlow: false };
  }
  const fast = ema(closes, fastPeriod);
  const slow = ema(closes, slowPeriod);
  const crosses = findCrosses(fast, slow, bars);
  const last = closes.length - 1;

  return {
    latestCross: crosses.length > 0 ? crosses[crosses.length - 1] : null,
    fastAboveSlow: fast[last] > slow[last],
    priceAboveSlow: closes[last] > slow[last],
  };
}

export function describeCross(type: CrossType): string {
  return type === "golden-cross" ? "Golden Cross" : "Death Cross";
}
