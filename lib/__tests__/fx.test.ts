import { describe, expect, it } from "vitest";
import {
  changeOver,
  defaultPairsFor,
  directionLabel,
  formatRate,
  lastDays,
  makePair,
  pairFromSlug,
  pairSlug,
  ratePercentile,
  sma,
  yearRange,
} from "../fx";
import type { FxBar } from "../types";

/** One bar a day from 2026-01-01, with the given rates. */
function series(rates: number[]): FxBar[] {
  return rates.map((rate, i) => ({
    date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
    rate,
  }));
}

describe("pairs", () => {
  it("builds, slugs and parses pairs", () => {
    expect(makePair("usd", " thb")).toBe("USD/THB");
    expect(makePair("USD", "USD")).toBeNull();
    expect(makePair("US", "THB")).toBeNull();
    expect(pairSlug("USD/THB")).toBe("usd-thb");
    expect(pairFromSlug("usd-thb")).toBe("USD/THB");
    expect(pairFromSlug("usd-thb-x")).toBeNull();
    expect(pairFromSlug("nonsense")).toBeNull();
  });

  it("seeds THB with dollar pairs first", () => {
    expect(defaultPairsFor("THB")).toEqual(["USD/THB", "EUR/THB", "JPY/THB", "GBP/THB"]);
    expect(defaultPairsFor("EUR")).toEqual(["USD/EUR", "JPY/EUR", "GBP/EUR"]);
  });

  it("labels the conversion direction", () => {
    expect(directionLabel("USD/THB", "base-to-quote")).toBe("USD→THB");
    expect(directionLabel("USD/THB", "quote-to-base")).toBe("THB→USD");
  });

  it("formats rates with sensible decimals", () => {
    expect(formatRate(33.5591)).toBe("33.559");
    expect(formatRate(1.08423)).toBe("1.0842");
    expect(formatRate(1432.55)).toBe("1,432.6");
  });
});

describe("series maths", () => {
  it("measures change against the last fix on or before the window start", () => {
    const bars = series([100, 101, 102, 103, 104, 105, 106, 110]);
    // Latest is day 8 (110); 7 days back is day 1 (100).
    expect(changeOver(bars, 7)).toBeCloseTo(0.1);
    expect(changeOver(bars, 30)).toBeNull();
    expect(changeOver(series([1]), 7)).toBeNull();
  });

  it("keeps only the last N days", () => {
    expect(lastDays(series([1, 2, 3, 4, 5]), 2).map((b) => b.rate)).toEqual([3, 4, 5]);
  });

  it("finds the 52-week range and where today sits in it", () => {
    const range = yearRange(series([30, 36, 33]))!;
    expect(range.low).toBe(30);
    expect(range.high).toBe(36);
    expect(range.position).toBeCloseTo(0.5);
  });

  it("reads the percentile from the conversion direction", () => {
    // 30 earlier days at 1..30, today at 25.5: beats 25 of 30 when higher is better.
    const bars = series([...Array.from({ length: 30 }, (_, i) => i + 1), 25.5]);
    expect(ratePercentile(bars, "base-to-quote")).toBeCloseTo(25 / 30);
    expect(ratePercentile(bars, "quote-to-base")).toBeCloseTo(5 / 30);
    expect(ratePercentile(series([1, 2, 3]), "base-to-quote")).toBeNull();
  });

  it("averages over a sliding window", () => {
    expect(sma([1, 2, 3, 4], 2)).toEqual([null, 1.5, 2.5, 3.5]);
  });
});
