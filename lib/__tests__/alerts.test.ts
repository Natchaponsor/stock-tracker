import { describe, expect, it } from "vitest";
import { computeAlerts } from "../alerts";
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

function quotes(entries: [string, number | null][]): Map<string, Quote> {
  return new Map(entries.map(([symbol, price]) => [symbol, { symbol, price, changePct: null, asOf: null }]));
}

describe("computeAlerts", () => {
  it("flags a position whose price reached its target, with the gain from selling now", () => {
    const [alert] = computeAlerts([makePosition({ target: 120 })], quotes([["AAPL", 125]]));
    expect(alert.kind).toBe("target");
    expect(alert.level).toBe(120);
    expect(alert.pnl).toBe(250); // (125-100)*10
    expect(alert.pnlPct).toBeCloseTo(0.25);
  });

  it("flags a position that fell to its stop", () => {
    const [alert] = computeAlerts([makePosition({ stop: 90 })], quotes([["AAPL", 88]]));
    expect(alert.kind).toBe("stop");
    expect(alert.pnl).toBe(-120);
  });

  it("ignores positions between their levels, without a quote, or closed", () => {
    const result = computeAlerts(
      [
        makePosition({ id: "a", stop: 90, target: 120 }),
        makePosition({ id: "b", symbol: "MSFT", target: 50 }),
        makePosition({ id: "c", symbol: "NVDA", target: 50, status: "closed" }),
      ],
      quotes([
        ["AAPL", 110],
        ["MSFT", null],
        ["NVDA", 80],
      ])
    );
    expect(result).toEqual([]);
  });

  it("puts stops before targets", () => {
    const result = computeAlerts(
      [makePosition({ id: "t", target: 101 }), makePosition({ id: "s", symbol: "MSFT", stop: 99 })],
      quotes([
        ["AAPL", 150],
        ["MSFT", 98],
      ])
    );
    expect(result.map((a) => a.kind)).toEqual(["stop", "target"]);
  });
});
