import type { DailyBar } from "./types";

/**
 * Daily closes are cached at two levels so opening the app doesn't hit the price
 * provider: the server keeps each answer until the next close is out, and each
 * device keeps the bars it has (hooks/usePriceHistory.ts) and only asks for days
 * it's missing. The bars are a per-device cache, never part of the synced book.
 */

/** The provider has the day's close by about 23:00 UTC (after 16:00 New York, either side of DST). */
export const CLOSE_READY_UTC_HOUR = 23;
const MIN_CACHE_SECONDS = 5 * 60;

/** Seconds until the next close should be available, so caches turn over once a day. */
export function secondsUntilNextClose(now: Date): number {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), CLOSE_READY_UTC_HOUR));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return Math.max(MIN_CACHE_SECONDS, Math.round((next.getTime() - now.getTime()) / 1000));
}

/** The latest moment a new close came out, at or before `now`. Bars fetched before it may be missing a day. */
export function lastCloseBoundary(now: Date): Date {
  const at = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), CLOSE_READY_UTC_HOUR));
  if (at.getTime() > now.getTime()) at.setUTCDate(at.getUTCDate() - 1);
  return at;
}

/** What a device holds for one symbol. */
export interface CachedBars {
  /** The earliest day asked for. Bars start on the first trading day on or after it. */
  from: string;
  bars: DailyBar[];
  /** When the newest bars were fetched (ISO). */
  fetchedAt: string;
}

/**
 * The `from` day to request for a symbol, or null when the cache already covers
 * `need` and is current. A current cache only re-asks from its last bar, so a
 * normal open fetches a day or nothing.
 */
export function planFetch(entry: CachedBars | undefined, need: string, now: Date): string | null {
  if (!entry || entry.from > need) return need;
  if (Date.parse(entry.fetchedAt) >= lastCloseBoundary(now).getTime()) return null;
  return entry.bars.length > 0 ? entry.bars[entry.bars.length - 1].date : entry.from;
}

/** Joins two bar lists by day (the newer list wins a day both have), oldest first. */
export function mergeBars(older: DailyBar[], newer: DailyBar[]): DailyBar[] {
  const byDate = new Map<string, DailyBar>();
  for (const bar of older) byDate.set(bar.date, bar);
  for (const bar of newer) byDate.set(bar.date, bar);
  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Closes restated in today's share terms: each close before a split is divided by
 * that split's factor, the way a broker restates history. Dividends are left out,
 * so a price is what the stock really traded at, only rescaled for splits.
 */
export function splitAdjustedCloses(bars: DailyBar[]): Map<string, number> {
  const out = new Map<string, number>();
  let factor = 1;
  for (let i = bars.length - 1; i >= 0; i--) {
    out.set(bars[i].date, bars[i].close / factor);
    // A split on this day is already in this close; it rescales the days before it.
    if (bars[i].splitFactor && bars[i].splitFactor! > 0) factor *= bars[i].splitFactor!;
  }
  return out;
}
