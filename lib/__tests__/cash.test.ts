import { describe, expect, it } from "vitest";
import { computeCashSummary, depositUsd } from "../cash";
import type { CashDeposit, Position } from "../types";

function makePosition(entries: Position["entries"], exits: Position["exits"] = []): Position {
  return {
    id: "p1",
    symbol: "AAPL",
    status: exits.length > 0 ? "closed" : "open",
    strategyIds: [],
    customTags: [],
    thesis: "",
    stop: null,
    target: null,
    entries,
    exits,
    notes: [],
    isSeed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("computeCashSummary", () => {
  it("returns the starting balance when there are no positions", () => {
    const summary = computeCashSummary(10000, []);
    expect(summary.cash).toBe(10000);
    expect(summary.totalBought).toBe(0);
    expect(summary.totalSold).toBe(0);
  });

  it("subtracts the cost of a buy from starting cash", () => {
    const position = makePosition([{ id: "e1", date: "2026-01-01T00:00:00.000Z", price: 100, qty: 10 }]);
    const summary = computeCashSummary(10000, [position]);
    expect(summary.totalBought).toBe(1000);
    expect(summary.cash).toBe(9000);
  });

  it("adds sale proceeds back to cash", () => {
    const position = makePosition(
      [{ id: "e1", date: "2026-01-01T00:00:00.000Z", price: 100, qty: 10 }],
      [{ id: "x1", date: "2026-02-01T00:00:00.000Z", price: 120, qty: 10 }]
    );
    const summary = computeCashSummary(10000, [position]);
    expect(summary.totalBought).toBe(1000);
    expect(summary.totalSold).toBe(1200);
    expect(summary.cash).toBe(10200);
  });

  it("aggregates across multiple positions", () => {
    const a = makePosition([{ id: "e1", date: "2026-01-01T00:00:00.000Z", price: 100, qty: 10 }]);
    const b = makePosition([{ id: "e2", date: "2026-01-02T00:00:00.000Z", price: 50, qty: 4 }]);
    const summary = computeCashSummary(5000, [a, b]);
    expect(summary.totalBought).toBe(1200);
    expect(summary.cash).toBe(3800);
  });
});

describe("cash deposits", () => {
  const deposit = (currency: string, amount: number, rate: number): CashDeposit => ({
    id: `${currency}-${amount}`,
    date: "2026-11-08T00:00:00.000Z",
    currency,
    amount,
    rate,
    rateSource: currency === "USD" ? null : "entered",
    rateDate: null,
    createdAt: "2026-11-08T00:00:00.000Z",
    updatedAt: "2026-11-08T00:00:00.000Z",
  });

  it("converts a deposit to dollars at its own rate", () => {
    expect(depositUsd(deposit("THB", 33_500, 33.5))).toBeCloseTo(1_000);
    expect(depositUsd(deposit("USD", 250, 1))).toBe(250);
  });

  it("adds deposits to cash and to the capital gains are measured against", () => {
    const summary = computeCashSummary(10_000, [makePosition([{ id: "e", date: "2026-01-02", price: 100, qty: 10 }])], [
      deposit("THB", 33_500, 33.5),
      deposit("USD", 500, 1),
    ]);
    expect(summary.totalDeposited).toBeCloseTo(1_500);
    expect(summary.capital).toBeCloseTo(11_500);
    expect(summary.cash).toBeCloseTo(10_500);
  });
});
