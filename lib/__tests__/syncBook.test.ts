import { describe, expect, it } from "vitest";
import { mergeBooks, normalizeStrategy, normalizeWatchItem, TOMBSTONE_TTL_DAYS, type SyncBook } from "../sync/book";
import type { CustomSector, Position, Strategy, WatchlistItem } from "../types";

const T = (day: number) => new Date(Date.UTC(2026, 10, day)).toISOString();
const NOW = Date.UTC(2026, 10, 20);

function position(overrides: Partial<Position> = {}): Position {
  return {
    id: "p1",
    symbol: "AAPL",
    status: "open",
    strategyIds: [],
    customTags: [],
    thesis: "",
    stop: null,
    target: null,
    entries: [{ id: "e1", date: T(1), price: 100, qty: 10 }],
    exits: [],
    notes: [],
    isSeed: false,
    createdAt: T(1),
    updatedAt: T(1),
    ...overrides,
  };
}

const strategy = (id: string, updatedAt: string, name = id): Strategy => ({
  id,
  name,
  entryRule: "",
  exitRule: "",
  createdAt: T(1),
  updatedAt,
});
const watch = (symbol: string, updatedAt = T(1)): WatchlistItem => ({ symbol, addedAt: T(1), updatedAt });
const sector = (id: string, symbols: string[], updatedAt: string): CustomSector => ({
  id,
  name: id,
  swatch: "cat-food",
  symbols,
  updatedAt,
});

function book(overrides: Partial<SyncBook> = {}): SyncBook {
  return {
    positions: [],
    strategies: [],
    watchlist: [],
    customSectors: [],
    startingCash: 10_000,
    startingCashUpdatedAt: null,
    watchlistOrderUpdatedAt: null,
    deletions: {},
    ...overrides,
  };
}

describe("mergeBooks", () => {
  it("keeps items that exist on only one side", () => {
    const merged = mergeBooks(book({ strategies: [strategy("a", T(2))] }), book({ strategies: [strategy("b", T(3))] }), NOW);
    expect(merged.strategies.map((s) => s.id).sort()).toEqual(["a", "b"]);
  });

  it("takes the newer edit when both sides changed the same item", () => {
    const merged = mergeBooks(
      book({ strategies: [strategy("a", T(2), "old name")] }),
      book({ strategies: [strategy("a", T(5), "new name")] }),
      NOW
    );
    expect(merged.strategies).toEqual([strategy("a", T(5), "new name")]);
  });

  it("is symmetric, so every device converges on the same book", () => {
    const a = book({
      positions: [position({ thesis: "A", updatedAt: T(3) })],
      watchlist: [watch("AAPL"), watch("NVDA")],
      watchlistOrderUpdatedAt: T(2),
      startingCash: 5_000,
      startingCashUpdatedAt: T(4),
    });
    const b = book({
      positions: [position({ thesis: "B", updatedAt: T(3) })],
      watchlist: [watch("NVDA"), watch("TSLA")],
      watchlistOrderUpdatedAt: T(6),
      deletions: { "strategy:x": T(2) },
    });
    expect(mergeBooks(a, b, NOW)).toEqual(mergeBooks(b, a, NOW));
  });

  it("unions fills and notes, so fills added on two devices both survive", () => {
    const fillA = { id: "x-a", date: T(4), price: 120, qty: 2 };
    const fillB = { id: "x-b", date: T(5), price: 125, qty: 3 };
    const merged = mergeBooks(
      book({ positions: [position({ exits: [fillA], updatedAt: T(4) })] }),
      book({
        positions: [
          position({
            exits: [fillB],
            notes: [{ id: "n1", date: T(5), text: "trimmed", priceAtNote: 125 }],
            updatedAt: T(5),
          }),
        ],
      }),
      NOW
    );
    expect(merged.positions[0].exits.map((f) => f.id)).toEqual(["x-a", "x-b"]);
    expect(merged.positions[0].notes).toHaveLength(1);
    expect(merged.positions[0].entries).toHaveLength(1);
  });

  it("drops an item deleted after its last edit", () => {
    const merged = mergeBooks(
      book({ positions: [position({ updatedAt: T(3) })] }),
      book({ deletions: { "position:p1": T(4) } }),
      NOW
    );
    expect(merged.positions).toEqual([]);
    expect(merged.deletions["position:p1"]).toBe(T(4));
  });

  it("keeps an item edited after it was deleted elsewhere", () => {
    const merged = mergeBooks(
      book({ positions: [position({ thesis: "still holding", updatedAt: T(6) })] }),
      book({ deletions: { "position:p1": T(4) } }),
      NOW
    );
    expect(merged.positions.map((p) => p.thesis)).toEqual(["still holding"]);
  });

  it("removes a watched symbol deleted on the other device", () => {
    const merged = mergeBooks(
      book({ watchlist: [watch("AAPL"), watch("COST")] }),
      book({ watchlist: [watch("AAPL")], deletions: { "watch:COST": T(3) } }),
      NOW
    );
    expect(merged.watchlist.map((w) => w.symbol)).toEqual(["AAPL"]);
  });

  it("uses the watchlist order from the side that reordered last, newcomers last", () => {
    const merged = mergeBooks(
      book({ watchlist: [watch("AAPL"), watch("NVDA"), watch("PLTR")], watchlistOrderUpdatedAt: T(2) }),
      book({ watchlist: [watch("NVDA"), watch("AAPL"), watch("COST")], watchlistOrderUpdatedAt: T(5) }),
      NOW
    );
    expect(merged.watchlist.map((w) => w.symbol)).toEqual(["NVDA", "AAPL", "COST", "PLTR"]);
  });

  it("takes starting cash from the side that changed it last", () => {
    const merged = mergeBooks(
      book({ startingCash: 5_000, startingCashUpdatedAt: T(5) }),
      book({ startingCash: 12_000, startingCashUpdatedAt: T(3) }),
      NOW
    );
    expect(merged.startingCash).toBe(5_000);
    expect(merged.startingCashUpdatedAt).toBe(T(5));
  });

  it("lets the most recently changed custom sector keep a symbol both claim", () => {
    const merged = mergeBooks(
      book({ customSectors: [sector("chips", ["NVDA", "AMD"], T(2))] }),
      book({ customSectors: [sector("ai", ["NVDA"], T(4))] }),
      NOW
    );
    const byId = Object.fromEntries(merged.customSectors.map((c) => [c.id, c.symbols]));
    expect(byId).toEqual({ chips: ["AMD"], ai: ["NVDA"] });
  });

  it("prunes tombstones older than the retention window", () => {
    const old = new Date(NOW - (TOMBSTONE_TTL_DAYS + 1) * 24 * 60 * 60_000).toISOString();
    const merged = mergeBooks(book({ deletions: { "strategy:old": old, "strategy:new": T(19) } }), book(), NOW);
    expect(Object.keys(merged.deletions)).toEqual(["strategy:new"]);
  });
});

describe("back-fill for data saved before sync", () => {
  it("dates strategies and watch items from when they were created or added", () => {
    const legacyStrategy = { id: "s", name: "S", entryRule: "", exitRule: "", createdAt: T(2) };
    expect(normalizeStrategy(legacyStrategy).updatedAt).toBe(T(2));
    expect(normalizeWatchItem({ symbol: "AAPL", addedAt: T(3) }).updatedAt).toBe(T(3));
  });
});
