import { describe, expect, it } from "vitest";
import { computeStrategyStats } from "../strategyStats";
import type { Position } from "../types";

function makePosition(overrides: Partial<Position> = {}): Position {
  return {
    id: "p1",
    symbol: "AAPL",
    status: "closed",
    strategyIds: ["strat-1"],
    customTags: [],
    thesis: "",
    stop: null,
    target: null,
    entries: [{ id: "e1", date: "2026-01-01T00:00:00.000Z", price: 100, qty: 10 }],
    exits: [{ id: "x1", date: "2026-02-01T00:00:00.000Z", price: 120, qty: 10 }],
    notes: [],
    isSeed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeStrategyStats", () => {
  it("counts a position tagged with the strategy among several", () => {
    const position = makePosition({ strategyIds: ["strat-other", "strat-1", "strat-another"] });
    const stats = computeStrategyStats("strat-1", [position]);
    expect(stats.totalCount).toBe(1);
    expect(stats.closedCount).toBe(1);
    expect(stats.winRate).toBe(1);
  });

  it("ignores positions that don't include the strategy", () => {
    const position = makePosition({ strategyIds: ["strat-other"] });
    const stats = computeStrategyStats("strat-1", [position]);
    expect(stats.totalCount).toBe(0);
  });

  it("counts a position tagged with only custom free-text tags as not using the strategy", () => {
    const position = makePosition({ strategyIds: [], customTags: ["earnings play"] });
    const stats = computeStrategyStats("strat-1", [position]);
    expect(stats.totalCount).toBe(0);
  });

  it("returns null win rate/avg return when nothing tagged with it has closed yet", () => {
    const position = makePosition({ status: "open", exits: [] });
    const stats = computeStrategyStats("strat-1", [position]);
    expect(stats.totalCount).toBe(1);
    expect(stats.closedCount).toBe(0);
    expect(stats.winRate).toBeNull();
    expect(stats.avgReturnPct).toBeNull();
  });
});
