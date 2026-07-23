import { describe, expect, it } from "vitest";
import { computePositionsValue, computeAllocation } from "../portfolio";
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

describe("computeAllocation", () => {
  it("includes cash as its own slice alongside each position", () => {
    const quotes = new Map([["AAPL", makeQuote("AAPL", 150)]]);
    const slices = computeAllocation(5000, [makePosition()], quotes);
    const cash = slices.find((s) => s.label === "Cash");
    const aapl = slices.find((s) => s.label === "AAPL");
    expect(cash?.value).toBe(5000);
    expect(aapl?.value).toBe(1500);
    // total = 5000 + 1500 = 6500
    expect(cash?.pct).toBeCloseTo(5000 / 6500);
    expect(aapl?.pct).toBeCloseTo(1500 / 6500);
  });

  it("aggregates multiple positions in the same symbol into one slice", () => {
    const a = makePosition({ id: "a", symbol: "AAPL", entries: [{ id: "e1", date: "2026-01-01T00:00:00.000Z", price: 100, qty: 10 }] });
    const b = makePosition({ id: "b", symbol: "AAPL", entries: [{ id: "e2", date: "2026-01-02T00:00:00.000Z", price: 100, qty: 5 }] });
    const slices = computeAllocation(0, [a, b], new Map());
    const aaplSlices = slices.filter((s) => s.label === "AAPL");
    expect(aaplSlices).toHaveLength(1);
    expect(aaplSlices[0].value).toBe(1500); // (10+5) * 100 fallback avg entry
  });

  it("sorts slices by value descending", () => {
    const small = makePosition({ id: "a", symbol: "MSFT", entries: [{ id: "e1", date: "2026-01-01T00:00:00.000Z", price: 10, qty: 1 }] });
    const slices = computeAllocation(100, [small], new Map());
    expect(slices[0].label).toBe("Cash");
    expect(slices[1].label).toBe("MSFT");
  });

  it("excludes closed positions", () => {
    const closed = makePosition({
      status: "closed",
      exits: [{ id: "x1", date: "2026-02-01T00:00:00.000Z", price: 120, qty: 10 }],
    });
    const slices = computeAllocation(1000, [closed], new Map());
    expect(slices).toHaveLength(1);
    expect(slices[0].label).toBe("Cash");
  });
});
