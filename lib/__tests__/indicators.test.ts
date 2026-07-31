import { describe, expect, it } from "vitest";
import { averageVolume, computeTrendState, ema, findCrosses, macd, rsi } from "../indicators";
import type { DailyBar } from "../types";

function makeBars(n: number): DailyBar[] {
  return Array.from({ length: n }, (_, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, "0")}`,
    close: 0,
    volume: null,
  }));
}

describe("ema", () => {
  it("returns an empty array for empty input", () => {
    expect(ema([], 10)).toEqual([]);
  });

  it("stays constant when the input is constant", () => {
    const closes = new Array(20).fill(100);
    const result = ema(closes, 5);
    for (const v of result) expect(v).toBeCloseTo(100);
  });

  it("lags behind a rising series but trends upward", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
    const result = ema(closes, 10);
    // EMA should be below the final price (it lags a rising trend) but rising itself
    expect(result[result.length - 1]).toBeLessThan(closes[closes.length - 1]);
    expect(result[result.length - 1]).toBeGreaterThan(result[0]);
  });
});

describe("findCrosses", () => {
  it("detects a golden cross when fast moves from below to above slow", () => {
    const fast = [1, 1, 2, 4, 5];
    const slow = [2, 2, 2, 2, 2];
    const bars = makeBars(5);
    const crosses = findCrosses(fast, slow, bars);
    expect(crosses).toHaveLength(1);
    expect(crosses[0].type).toBe("golden-cross");
    expect(crosses[0].index).toBe(3);
  });

  it("detects a death cross when fast moves from above to below slow", () => {
    const fast = [5, 4, 2, 1, 1];
    const slow = [2, 2, 2, 2, 2];
    const bars = makeBars(5);
    const crosses = findCrosses(fast, slow, bars);
    expect(crosses).toHaveLength(1);
    expect(crosses[0].type).toBe("death-cross");
  });

  it("detects multiple crosses in sequence", () => {
    const fast = [1, 3, 1, 3, 1];
    const slow = [2, 2, 2, 2, 2];
    const bars = makeBars(5);
    const crosses = findCrosses(fast, slow, bars);
    expect(crosses.map((c) => c.type)).toEqual([
      "golden-cross",
      "death-cross",
      "golden-cross",
      "death-cross",
    ]);
  });
});

describe("computeTrendState", () => {
  it("reports bullish state after a sustained uptrend", () => {
    const closes = Array.from({ length: 250 }, (_, i) => 100 + i * 0.5);
    const bars = makeBars(250);
    const state = computeTrendState(closes, bars, 10, 30);
    expect(state.fastAboveSlow).toBe(true);
    expect(state.priceAboveSlow).toBe(true);
  });

  it("returns a neutral state for empty input", () => {
    const state = computeTrendState([], []);
    expect(state.latestCross).toBeNull();
    expect(state.fastAboveSlow).toBe(false);
  });
});

describe("rsi", () => {
  it("returns NaN for every index before a full period of history", () => {
    const closes = Array.from({ length: 10 }, (_, i) => 100 + i);
    const result = rsi(closes, 14);
    expect(result.every((v) => Number.isNaN(v))).toBe(true);
  });

  it("reads 100 for a strictly rising series (no losses at all)", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
    const result = rsi(closes, 14);
    expect(result[result.length - 1]).toBe(100);
  });

  it("reads 0 for a strictly falling series (no gains at all)", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 200 - i);
    const result = rsi(closes, 14);
    expect(result[result.length - 1]).toBe(0);
  });

  it("stays within 0..100 for a mixed series", () => {
    const closes = [100, 102, 99, 105, 103, 108, 104, 110, 107, 112, 109, 115, 111, 118, 116, 120];
    const result = rsi(closes, 14);
    for (const v of result) {
      if (!Number.isNaN(v)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("macd", () => {
  it("has a zero histogram when the input is constant", () => {
    const closes = new Array(60).fill(100);
    const result = macd(closes);
    for (const v of result.histogram) expect(v).toBeCloseTo(0);
  });

  it("goes positive once a sustained uptrend pulls the fast EMA above the slow EMA", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i);
    const result = macd(closes, 12, 26, 9);
    expect(result.histogram[result.histogram.length - 1]).toBeGreaterThan(0);
  });
});

describe("averageVolume", () => {
  it("is null before a full window of volume is available", () => {
    const volumes = Array.from({ length: 10 }, () => 1000);
    const result = averageVolume(volumes, 20);
    expect(result.every((v) => v === null)).toBe(true);
  });

  it("averages a constant series to itself", () => {
    const volumes = Array.from({ length: 25 }, () => 1000);
    const result = averageVolume(volumes, 20);
    expect(result[result.length - 1]).toBeCloseTo(1000);
  });

  it("is null for any window containing a missing (null) volume", () => {
    const volumes: (number | null)[] = Array.from({ length: 30 }, (_, i) => (i === 5 ? null : 1000));
    const result = averageVolume(volumes, 20);
    // the window covering index 5 (indices 0..19) should be null; once the
    // window has fully moved past index 5 (indices 6..25), it's clean again
    expect(result[19]).toBeNull();
    expect(result[25]).toBeCloseTo(1000);
  });
});
