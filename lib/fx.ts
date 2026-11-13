import type { FxBar, FxDirection, FxPair } from "./types";

/**
 * FX helpers shared by the FX pages, the rate routes and the alert check.
 * Rates are daily reference rates (Frankfurter), so every "change" here is
 * between daily fixes, never intraday.
 */

/** Currencies offered in the pickers. Frankfurter carries many more; these cover most uses. */
export const FX_CURRENCIES: Record<string, string> = {
  USD: "US dollar",
  THB: "Thai baht",
  EUR: "Euro",
  JPY: "Japanese yen",
  GBP: "British pound",
  CNY: "Chinese yuan",
  SGD: "Singapore dollar",
  HKD: "Hong Kong dollar",
  AUD: "Australian dollar",
  CAD: "Canadian dollar",
  CHF: "Swiss franc",
  KRW: "South Korean won",
  MYR: "Malaysian ringgit",
  TWD: "New Taiwan dollar",
  INR: "Indian rupee",
  IDR: "Indonesian rupiah",
  VND: "Vietnamese dong",
  PHP: "Philippine peso",
  NZD: "New Zealand dollar",
};

export const FX_CODES = Object.keys(FX_CURRENCIES);

/** Pairs the FX watchlist starts with for a home currency. USD first: the book is in dollars. */
export function defaultPairsFor(home: string): FxPair[] {
  if (home === "USD") return ["EUR/USD", "USD/JPY", "GBP/USD"];
  return (["USD", "EUR", "JPY", "GBP"].filter((c) => c !== home)).map((c) => `${c}/${home}` as FxPair);
}

const CODE_RE = /^[A-Z]{3}$/;

export function makePair(base: string, quote: string): FxPair | null {
  const b = base.trim().toUpperCase();
  const q = quote.trim().toUpperCase();
  if (!CODE_RE.test(b) || !CODE_RE.test(q) || b === q) return null;
  return `${b}/${q}`;
}

export function splitPair(pair: FxPair): [string, string] {
  const [base, quote] = pair.split("/");
  return [base, quote];
}

/** "USD/THB" → "usd-thb", for URLs. */
export function pairSlug(pair: FxPair): string {
  return pair.replace("/", "-").toLowerCase();
}

/** "usd-thb" → "USD/THB", or null when the slug isn't two currency codes. */
export function pairFromSlug(slug: string): FxPair | null {
  const [base, quote, extra] = slug.split("-");
  if (extra !== undefined || !base || !quote) return null;
  return makePair(base, quote);
}

/** Digits that make a rate readable: 33.559, 1.0842, 0.2214, 1,432.5. */
export function rateDecimals(rate: number): number {
  const abs = Math.abs(rate);
  if (abs >= 1000) return 1;
  if (abs >= 100) return 2;
  if (abs >= 10) return 3;
  return 4;
}

export function formatRate(rate: number, decimals = rateDecimals(rate)): string {
  return rate.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatMoney(amount: number, currency: string): string {
  const decimals = ["JPY", "KRW", "VND", "IDR"].includes(currency) ? 0 : 2;
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${currency}`;
}

/** The arrow in "USD→THB", for the direction a user converts. */
export function directionLabel(pair: FxPair, direction: FxDirection): string {
  const [base, quote] = splitPair(pair);
  return direction === "base-to-quote" ? `${base}→${quote}` : `${quote}→${base}`;
}

/** True when `a` is a better rate than `b` for someone converting in `direction`. */
export function isBetter(a: number, b: number, direction: FxDirection): boolean {
  return direction === "base-to-quote" ? a > b : a < b;
}

// ── Series maths ─────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60_000;

function daysBefore(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) - days * DAY_MS).toISOString().slice(0, 10);
}

/** Bars on or after `days` before the last bar's date. */
export function lastDays(bars: FxBar[], days: number): FxBar[] {
  if (bars.length === 0) return [];
  const from = daysBefore(bars[bars.length - 1].date, days);
  return bars.filter((b) => b.date >= from);
}

/** Fractional change from the last fix on or before `days` ago to the latest, or null without history. */
export function changeOver(bars: FxBar[], days: number): number | null {
  if (bars.length < 2) return null;
  const latest = bars[bars.length - 1];
  const target = daysBefore(latest.date, days);
  let past: FxBar | null = null;
  for (const bar of bars) {
    if (bar.date <= target) past = bar;
    else break;
  }
  if (!past || past.rate === 0) return null;
  return latest.rate / past.rate - 1;
}

export interface YearRange {
  low: number;
  high: number;
  /** Where the latest rate sits between low (0) and high (1). */
  position: number;
}

export function yearRange(bars: FxBar[]): YearRange | null {
  const year = lastDays(bars, 365);
  if (year.length < 2) return null;
  let low = Infinity;
  let high = -Infinity;
  for (const b of year) {
    low = Math.min(low, b.rate);
    high = Math.max(high, b.rate);
  }
  const latest = year[year.length - 1].rate;
  return { low, high, position: high === low ? 0.5 : (latest - low) / (high - low) };
}

/**
 * Share of the past year's daily fixes that the latest rate beats, for someone
 * converting in `direction` (0–1). "Better than 82% of days" reads from this.
 * Null with under a month of history.
 */
export function ratePercentile(bars: FxBar[], direction: FxDirection): number | null {
  const year = lastDays(bars, 365);
  if (year.length < 20) return null;
  const latest = year[year.length - 1].rate;
  const earlier = year.slice(0, -1);
  const beaten = earlier.filter((b) => isBetter(latest, b.rate, direction)).length;
  return beaten / earlier.length;
}

/** Simple moving average; null until `period` values are in. */
export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export type FxRange = "1M" | "6M" | "1Y" | "5Y" | "10Y";
export const FX_RANGES: readonly FxRange[] = ["1M", "6M", "1Y", "5Y", "10Y"];
export const FX_RANGE_DAYS: Record<FxRange, number> = { "1M": 31, "6M": 183, "1Y": 365, "5Y": 1826, "10Y": 3652 };

/** "12 Nov 2026" for a YYYY-MM-DD rate date. */
export function formatRateDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
