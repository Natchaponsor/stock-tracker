import { describe, expect, it } from "vitest";
import { bestMover, computeDayChange } from "../dayChange";
import type { Position, Quote } from "../types";

function makePosition(overrides: Partial<Position> = {}): Position {
  return {
    id: "p1",
    symbol: "AAPL",
    status: "open",
    strategyIds: [],
    customTags: [],
    thesis: "",
    stop: null,
    target: null,
    entries: [{ id: "e1", date: "2026-01-01T00:00:00.000Z", price: 100, qty: 10 }],
    exits: [],
    notes: [],
    isSeed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function quote(symbol: string, price: number | null, changePct: number | null): [string, Quote] {
  return [symbol, { symbol, price, changePct, asOf: null }];
}

describe("computeDayChange", () => {
  it("measures today's move from the previous close implied by changePct", () => {
    // 110 after a +10% day means the previous close was 100.
    const result = computeDayChange([makePosition()], new Map([quote("AAPL", 110, 10)]));
    expect(result.amount).toBeCloseTo(100); // (110-100)*10
    expect(result.pct).toBeCloseTo(0.1);
  });

  it("skips holdings without a change and reports null when none are quoted", () => {
    const result = computeDayChange([makePosition()], new Map([quote("AAPL", 110, null)]));
    expect(result).toEqual({ amount: null, pct: null });
  });
});

describe("bestMover", () => {
  it("picks the biggest gainer among quoted symbols", () => {
    const quotes = new Map([quote("AAPL", 1, 0.5), quote("NVDA", 1, 2.1), quote("PLTR", 1, -1), quote("X", null, 9)]);
    expect(bestMover(quotes)).toEqual({ symbol: "NVDA", changePct: 2.1 });
  });
});
