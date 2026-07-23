import { describe, expect, it } from "vitest";
import { buildExportPayload, validateImportPayload } from "../exportData";
import type { Position } from "../types";

function makePosition(): Position {
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
  };
}

describe("validateImportPayload", () => {
  it("accepts a payload round-tripped through buildExportPayload", () => {
    const exported = buildExportPayload(5000, [makePosition()], [], []);
    const result = validateImportPayload(JSON.parse(JSON.stringify(exported)));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.startingCash).toBe(5000);
      expect(result.payload.positions).toHaveLength(1);
    }
  });

  it("rejects non-object input", () => {
    const result = validateImportPayload("not an object");
    expect(result.ok).toBe(false);
  });

  it("rejects a payload missing startingCash", () => {
    const result = validateImportPayload({ positions: [], strategies: [], watchlist: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/startingCash/);
  });

  it("rejects a payload with malformed positions", () => {
    const result = validateImportPayload({
      startingCash: 100,
      positions: [{ id: "p1" }], // missing required fields
      strategies: [],
      watchlist: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/positions/);
  });

  it("rejects a payload with a non-array watchlist", () => {
    const result = validateImportPayload({
      startingCash: 100,
      positions: [],
      strategies: [],
      watchlist: "oops",
    });
    expect(result.ok).toBe(false);
  });
});
