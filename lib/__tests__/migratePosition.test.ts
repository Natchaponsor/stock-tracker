import { describe, expect, it } from "vitest";
import { migratePositionShape } from "../migratePosition";

describe("migratePositionShape", () => {
  it("folds a legacy strategyId into strategyIds and defaults customTags", () => {
    const legacy = { id: "p1", symbol: "AAPL", strategyId: "strat-1" };
    const migrated = migratePositionShape(legacy);
    expect(migrated.strategyIds).toEqual(["strat-1"]);
    expect(migrated.customTags).toEqual([]);
    expect((migrated as unknown as { strategyId?: string }).strategyId).toBeUndefined();
  });

  it("defaults to an empty strategyIds array when there was no strategyId", () => {
    const legacy = { id: "p1", symbol: "AAPL", strategyId: null };
    const migrated = migratePositionShape(legacy);
    expect(migrated.strategyIds).toEqual([]);
  });

  it("leaves an already-current-shape position untouched", () => {
    const current = { id: "p1", symbol: "AAPL", strategyIds: ["strat-1", "strat-2"], customTags: ["earnings play"] };
    const migrated = migratePositionShape(current);
    expect(migrated.strategyIds).toEqual(["strat-1", "strat-2"]);
    expect(migrated.customTags).toEqual(["earnings play"]);
  });

  it("preserves every other field unchanged", () => {
    const legacy = { id: "p1", symbol: "AAPL", status: "open", strategyId: "strat-1", thesis: "hi" };
    const migrated = migratePositionShape(legacy);
    expect(migrated.symbol).toBe("AAPL");
    expect(migrated.status).toBe("open");
    expect(migrated.thesis).toBe("hi");
  });
});
