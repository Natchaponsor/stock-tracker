import { describe, expect, it } from "vitest";
import { buildExportPayload, validateImportPayload } from "../exportData";
import type { Position } from "../types";

function makePosition(): Position {
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

  it("migrates a pre-multi-strategy export (bare strategyId) into strategyIds/customTags", () => {
    const legacyPosition = {
      id: "p1",
      symbol: "AAPL",
      status: "open",
      strategyId: "strat-1",
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
    const result = validateImportPayload({
      startingCash: 100,
      positions: [legacyPosition],
      strategies: [],
      watchlist: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.positions[0].strategyIds).toEqual(["strat-1"]);
      expect(result.payload.positions[0].customTags).toEqual([]);
    }
  });

  it("round-trips custom sectors", () => {
    const sectors = [
      { id: "s1", name: "AI chips", swatch: "cat-fun" as const, symbols: ["NVDA", "AMD"], updatedAt: "2026-01-01T00:00:00.000Z" },
    ];
    const exported = buildExportPayload(100, [], [], [], sectors);
    const result = validateImportPayload(JSON.parse(JSON.stringify(exported)));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.customSectors).toEqual(sectors);
  });

  it("imports a version 1 file with no custom sectors as an empty list", () => {
    const result = validateImportPayload({ version: 1, startingCash: 100, positions: [], strategies: [], watchlist: [] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.customSectors).toEqual([]);
  });

  it("rejects a custom sector with an unknown colour", () => {
    const result = validateImportPayload({
      startingCash: 100,
      positions: [],
      strategies: [],
      watchlist: [],
      customSectors: [{ id: "s1", name: "X", swatch: "#ff0000", symbols: [] }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/customSectors/);
  });
});

describe("FX in exports", () => {
  it("round-trips the FX watchlist and alerts", () => {
    const exported = buildExportPayload(
      0,
      [],
      [],
      [],
      [],
      [{ pair: "USD/THB", direction: "base-to-quote", addedAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" }],
      [
        {
          id: "a1",
          pair: "USD/THB",
          condition: { kind: "below", level: 33.5 },
          repeat: "rearm",
          state: "armed",
          firedAt: null,
          firedRate: null,
          seen: true,
          note: "Q1 top-up",
          createdAt: "2026-11-01T00:00:00.000Z",
          updatedAt: "2026-11-01T00:00:00.000Z",
        },
      ]
    );
    const result = validateImportPayload(JSON.parse(JSON.stringify(exported)));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.fxWatchlist).toEqual(exported.fxWatchlist);
      expect(result.payload.fxAlerts).toEqual(exported.fxAlerts);
    }
  });

  it("imports a v2 file with no FX", () => {
    const v2 = { version: 2, startingCash: 1, positions: [], strategies: [], watchlist: [], customSectors: [] };
    const result = validateImportPayload(v2);
    expect(result.ok && result.payload.fxWatchlist).toEqual([]);
  });

  it("rejects a malformed FX alert", () => {
    const bad = { startingCash: 1, positions: [], strategies: [], watchlist: [], fxAlerts: [{ id: "x", pair: "USDTHB" }] };
    expect(validateImportPayload(bad).ok).toBe(false);
  });
});

describe("cash deposits in exports", () => {
  const deposit = {
    id: "c1",
    date: "2026-11-08T00:00:00.000Z",
    currency: "THB",
    amount: 33_515,
    rate: 33.515,
    rateSource: "reference" as const,
    rateDate: "2026-11-08",
    note: "Top-up",
    createdAt: "2026-11-08T03:00:00.000Z",
    updatedAt: "2026-11-08T03:00:00.000Z",
  };

  it("round-trips deposits as a version 4 file", () => {
    const payload = buildExportPayload(1_000, [], [], [], [], [], [], [deposit]);
    expect(payload.version).toBe(4);
    const result = validateImportPayload(JSON.parse(JSON.stringify(payload)));
    expect(result.ok && result.payload.cashDeposits).toEqual([deposit]);
  });

  it("imports a v3 file with no deposits", () => {
    const v3 = { version: 3, startingCash: 1, positions: [], strategies: [], watchlist: [], fxWatchlist: [], fxAlerts: [] };
    const result = validateImportPayload(v3);
    expect(result.ok && result.payload.cashDeposits).toEqual([]);
  });

  it("rejects a deposit with no amount or a zero rate", () => {
    const base = { startingCash: 1, positions: [], strategies: [], watchlist: [] };
    expect(validateImportPayload({ ...base, cashDeposits: [{ ...deposit, amount: 0 }] }).ok).toBe(false);
    expect(validateImportPayload({ ...base, cashDeposits: [{ ...deposit, rate: 0 }] }).ok).toBe(false);
    expect(validateImportPayload({ ...base, cashDeposits: [{ ...deposit, currency: "baht" }] }).ok).toBe(false);
  });

  it("pins a dollar deposit to a rate of 1", () => {
    const base = { startingCash: 1, positions: [], strategies: [], watchlist: [] };
    const result = validateImportPayload({ ...base, cashDeposits: [{ ...deposit, currency: "USD", rate: 2 }] });
    expect(result.ok && result.payload.cashDeposits[0]).toMatchObject({ rate: 1, rateSource: null });
  });
});
