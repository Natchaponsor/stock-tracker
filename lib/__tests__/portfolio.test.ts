import { describe, expect, it } from "vitest";
import {
  computePositionsValue,
  computeAllocation,
  computePnlSummary,
  computeSymbolPnlBreakdown,
  allocateFifoSell,
} from "../portfolio";
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

describe("computePnlSummary", () => {
  it("sums unrealized P&L across open positions with a live quote", () => {
    const quotes = new Map([["AAPL", makeQuote("AAPL", 150)]]);
    const result = computePnlSummary([makePosition()], quotes);
    expect(result.totalUnrealized).toBe(500); // (150-100)*10
    expect(result.totalRealized).toBe(0);
    expect(result.positionsWithoutPrice).toBe(0);
  });

  it("sums realized P&L from closed positions and excludes them from unrealized", () => {
    const closed = makePosition({
      status: "closed",
      exits: [{ id: "x1", date: "2026-02-01T00:00:00.000Z", price: 120, qty: 10 }],
    });
    const result = computePnlSummary([closed], new Map());
    expect(result.totalRealized).toBe(200); // (120-100)*10
    expect(result.totalUnrealized).toBe(0);
  });

  it("counts a partially-sold open position's realized gain and remaining unrealized separately", () => {
    const scaled = makePosition({
      entries: [{ id: "e1", date: "2026-01-01T00:00:00.000Z", price: 100, qty: 10 }],
      exits: [{ id: "x1", date: "2026-01-15T00:00:00.000Z", price: 110, qty: 4 }],
    });
    const quotes = new Map([["AAPL", makeQuote("AAPL", 130)]]);
    const result = computePnlSummary([scaled], quotes);
    expect(result.totalRealized).toBe(40); // (110-100)*4
    expect(result.totalUnrealized).toBe(180); // (130-100)*6
  });

  it("flags open positions missing a live quote instead of counting them as zero", () => {
    const result = computePnlSummary([makePosition()], new Map());
    expect(result.positionsWithoutPrice).toBe(1);
    expect(result.totalUnrealized).toBe(0);
  });
});

describe("computeSymbolPnlBreakdown", () => {
  it("combines realized and unrealized P&L per symbol", () => {
    const aapl = makePosition({ id: "a", symbol: "AAPL" });
    const msft = makePosition({
      id: "b",
      symbol: "MSFT",
      entries: [{ id: "e2", date: "2026-01-01T00:00:00.000Z", price: 200, qty: 5 }],
    });
    const quotes = new Map([
      ["AAPL", makeQuote("AAPL", 150)],
      ["MSFT", makeQuote("MSFT", 190)],
    ]);
    const result = computeSymbolPnlBreakdown([aapl, msft], quotes);
    const aaplRow = result.find((r) => r.symbol === "AAPL");
    const msftRow = result.find((r) => r.symbol === "MSFT");
    expect(aaplRow?.unrealizedPnl).toBe(500); // (150-100)*10
    expect(msftRow?.unrealizedPnl).toBe(-50); // (190-200)*5
  });

  it("aggregates a closed lot and a fresh open lot of the same symbol into one row", () => {
    const closed = makePosition({
      id: "a",
      status: "closed",
      exits: [{ id: "x1", date: "2026-02-01T00:00:00.000Z", price: 120, qty: 10 }],
    });
    const reopened = makePosition({
      id: "b",
      entries: [{ id: "e2", date: "2026-03-01T00:00:00.000Z", price: 140, qty: 5 }],
    });
    const quotes = new Map([["AAPL", makeQuote("AAPL", 150)]]);
    const result = computeSymbolPnlBreakdown([closed, reopened], quotes);
    expect(result).toHaveLength(1);
    expect(result[0].realizedPnl).toBe(200); // (120-100)*10 from the closed lot
    expect(result[0].unrealizedPnl).toBe(50); // (150-140)*5 from the still-open lot
  });

  it("reports unrealized as null when open shares exist but there's no quote yet", () => {
    const result = computeSymbolPnlBreakdown([makePosition()], new Map());
    expect(result[0].unrealizedPnl).toBeNull();
  });

  it("sorts by combined P&L magnitude, largest first", () => {
    const small = makePosition({ id: "a", symbol: "MSFT", entries: [{ id: "e1", date: "2026-01-01T00:00:00.000Z", price: 10, qty: 1 }] });
    const big = makePosition({ id: "b", symbol: "AAPL", entries: [{ id: "e2", date: "2026-01-01T00:00:00.000Z", price: 100, qty: 10 }] });
    const quotes = new Map([
      ["MSFT", makeQuote("MSFT", 11)],
      ["AAPL", makeQuote("AAPL", 150)],
    ]);
    const result = computeSymbolPnlBreakdown([small, big], quotes);
    expect(result[0].symbol).toBe("AAPL");
  });
});

describe("allocateFifoSell", () => {
  it("takes shares from a single lot when it covers the whole sell", () => {
    const lot = makePosition();
    const allocations = allocateFifoSell([lot], 4);
    expect(allocations).toEqual([{ positionId: "p1", qty: 4, willFullyClose: false }]);
  });

  it("fully closes a lot when the sell exactly matches its open quantity", () => {
    const lot = makePosition();
    const allocations = allocateFifoSell([lot], 10);
    expect(allocations).toEqual([{ positionId: "p1", qty: 10, willFullyClose: true }]);
  });

  it("depletes the oldest lot first, then spills into the next-oldest", () => {
    const older = makePosition({
      id: "old",
      entries: [{ id: "e1", date: "2026-01-01T00:00:00.000Z", price: 100, qty: 5 }],
    });
    const newer = makePosition({
      id: "new",
      entries: [{ id: "e2", date: "2026-03-01T00:00:00.000Z", price: 120, qty: 10 }],
    });
    // pass newer before older to prove sort order comes from entry date, not array order
    const allocations = allocateFifoSell([newer, older], 8);
    expect(allocations).toEqual([
      { positionId: "old", qty: 5, willFullyClose: true },
      { positionId: "new", qty: 3, willFullyClose: false },
    ]);
  });

  it("returns null when the requested quantity exceeds every open lot combined", () => {
    const lot = makePosition();
    expect(allocateFifoSell([lot], 11)).toBeNull();
  });

  it("returns null for a zero or negative quantity", () => {
    const lot = makePosition();
    expect(allocateFifoSell([lot], 0)).toBeNull();
    expect(allocateFifoSell([lot], -5)).toBeNull();
  });

  it("ignores lots that are already fully closed", () => {
    const closed = makePosition({
      status: "closed",
      exits: [{ id: "x1", date: "2026-02-01T00:00:00.000Z", price: 120, qty: 10 }],
    });
    expect(allocateFifoSell([closed], 1)).toBeNull();
  });
});
