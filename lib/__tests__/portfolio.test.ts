import { describe, expect, it } from "vitest";
import { computePositionsValue } from "../portfolio";
import type { Position, Quote } from "../types";

function makePosition(overrides: Partial<Position> = {}): Position {
  return {
    id: "p1",
    symbol: "AAPL",
    status: "open",
    strategyId: null,
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

function makeQuote(symbol: string, price: number | null): Quote {
  return { symbol, price, changePct: null, asOf: null };
}

describe("computePositionsValue", () => {
  it("marks open positions to the live quote when available", () => {
    const quotes = new Map([["AAPL", makeQuote("AAPL", 150)]]);
    const result = computePositionsValue([makePosition()], quotes);
    expect(result.positionsValue).toBe(1500);
    expect(result.positionsWithoutPrice).toBe(0);
  });

  it("falls back to average entry price when no live quote exists yet", () => {
    const result = computePositionsValue([makePosition()], new Map());
    expect(result.positionsValue).toBe(1000);
    expect(result.positionsWithoutPrice).toBe(1);
  });

  it("excludes closed positions from portfolio value", () => {
    const closed = makePosition({
      status: "closed",
      exits: [{ id: "x1", date: "2026-02-01T00:00:00.000Z", price: 120, qty: 10 }],
    });
    const result = computePositionsValue([closed], new Map());
    expect(result.positionsValue).toBe(0);
    expect(result.positionsWithoutPrice).toBe(0);
  });

  it("sums across multiple open positions", () => {
    const a = makePosition({ id: "a", symbol: "AAPL" });
    const b = makePosition({ id: "b", symbol: "MSFT", entries: [{ id: "e2", date: "2026-01-01T00:00:00.000Z", price: 200, qty: 5 }] });
    const quotes = new Map([
      ["AAPL", makeQuote("AAPL", 150)],
      ["MSFT", makeQuote("MSFT", 210)],
    ]);
    const result = computePositionsValue([a, b], quotes);
    expect(result.positionsValue).toBe(150 * 10 + 210 * 5);
  });
});
