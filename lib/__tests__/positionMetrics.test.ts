import { describe, expect, it } from "vitest";
import { computePositionMetrics } from "../positionMetrics";
import type { Position } from "../types";

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

describe("computePositionMetrics", () => {
  it("computes unrealized P&L for an open single-entry position", () => {
    const m = computePositionMetrics(makePosition(), 110);
    expect(m.avgEntryPrice).toBe(100);
    expect(m.openQty).toBe(10);
    expect(m.unrealizedPnl).toBeCloseTo(100); // (110-100)*10
    expect(m.realizedPnl).toBe(0);
    expect(m.totalPnl).toBeCloseTo(100);
    expect(m.returnPct).toBeCloseTo(0.1);
  });

  it("returns null unrealized/total P&L when open with no live price yet", () => {
    const m = computePositionMetrics(makePosition(), null);
    expect(m.unrealizedPnl).toBeNull();
    expect(m.totalPnl).toBeNull();
  });

  it("weights average entry price across multiple scale-in fills", () => {
    const position = makePosition({
      entries: [
        { id: "e1", date: "2026-01-01T00:00:00.000Z", price: 100, qty: 10 },
        { id: "e2", date: "2026-01-05T00:00:00.000Z", price: 120, qty: 10 },
      ],
    });
    const m = computePositionMetrics(position, 130);
    expect(m.avgEntryPrice).toBeCloseTo(110);
    expect(m.openQty).toBe(20);
    expect(m.unrealizedPnl).toBeCloseTo((130 - 110) * 20);
  });

  it("computes realized P&L and zero unrealized for a fully closed position", () => {
    const position = makePosition({
      status: "closed",
      exits: [{ id: "x1", date: "2026-02-01T00:00:00.000Z", price: 120, qty: 10 }],
    });
    const m = computePositionMetrics(position, null);
    expect(m.openQty).toBe(0);
    expect(m.realizedPnl).toBeCloseTo(200); // (120-100)*10
    expect(m.unrealizedPnl).toBe(0);
    expect(m.totalPnl).toBeCloseTo(200);
    expect(m.returnPct).toBeCloseTo(0.2);
  });

  it("computes daysHeld between first entry and now for an open position", () => {
    const now = Date.now();
    const entryDate = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();
    const m = computePositionMetrics(makePosition({ entries: [{ id: "e1", date: entryDate, price: 100, qty: 10 }] }), 100);
    expect(m.daysHeld).toBeGreaterThanOrEqual(4);
    expect(m.daysHeld).toBeLessThanOrEqual(6);
  });

  it("computes daysHeld between first entry and last exit for a closed position", () => {
    const position = makePosition({
      status: "closed",
      entries: [{ id: "e1", date: "2026-01-01T00:00:00.000Z", price: 100, qty: 10 }],
      exits: [{ id: "x1", date: "2026-01-11T00:00:00.000Z", price: 110, qty: 10 }],
    });
    const m = computePositionMetrics(position, null);
    expect(m.daysHeld).toBe(10);
  });
});
