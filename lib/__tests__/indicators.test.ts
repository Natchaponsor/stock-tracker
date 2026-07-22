import { describe, expect, it } from "vitest";
import { ema, findCrosses, computeTrendState } from "../indicators";
import type { DailyBar } from "../types";

function makeBars(n: number): DailyBar[] {
  return Array.from({ length: n }, (_, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, "0")}`,
    close: 0,
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
