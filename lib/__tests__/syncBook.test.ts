import { describe, expect, it } from "vitest";
import { mergeBooks, normalizeStrategy, normalizeSyncBook, normalizeWatchItem, TOMBSTONE_TTL_DAYS, type SyncBook } from "../sync/book";
import type { CashDeposit, CustomSector, FxAlert, FxPair, FxWatchItem, Position, Strategy, SyncDevice, WatchlistItem } from "../types";

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
    fxWatchlist: [],
    fxWatchlistOrderUpdatedAt: null,
    fxAlerts: [],
    cashDeposits: [],
    devices: [],
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

describe("FX in the synced book", () => {
  const fxWatch = (pair: FxPair, updatedAt = T(1), direction: FxWatchItem["direction"] = "base-to-quote"): FxWatchItem => ({
    pair,
    direction,
    addedAt: T(1),
    updatedAt,
  });
  const fxAlert = (id: string, updatedAt: string, overrides: Partial<FxAlert> = {}): FxAlert => ({
    id,
    pair: "USD/THB",
    condition: { kind: "below", level: 33.5 },
    repeat: "once",
    state: "armed",
    firedAt: null,
    firedRate: null,
    seen: true,
    createdAt: T(1),
    updatedAt,
    ...overrides,
  });

  it("keeps pairs from both devices, in the order of whichever reordered last", () => {
    const merged = mergeBooks(
      book({ fxWatchlist: [fxWatch("USD/THB"), fxWatch("EUR/THB")], fxWatchlistOrderUpdatedAt: T(5) }),
      book({ fxWatchlist: [fxWatch("EUR/THB"), fxWatch("JPY/THB")], fxWatchlistOrderUpdatedAt: T(3) }),
      NOW
    );
    expect(merged.fxWatchlist.map((w) => w.pair)).toEqual(["USD/THB", "EUR/THB", "JPY/THB"]);
    expect(merged.fxWatchlistOrderUpdatedAt).toBe(T(5));
  });

  it("takes the newer conversion direction for a pair edited on both devices", () => {
    const merged = mergeBooks(
      book({ fxWatchlist: [fxWatch("USD/THB", T(2), "base-to-quote")] }),
      book({ fxWatchlist: [fxWatch("USD/THB", T(4), "quote-to-base")] }),
      NOW
    );
    expect(merged.fxWatchlist).toEqual([fxWatch("USD/THB", T(4), "quote-to-base")]);
  });

  it("drops a pair removed on one device and not changed since", () => {
    const merged = mergeBooks(
      book({ fxWatchlist: [fxWatch("USD/THB", T(2))] }),
      book({ deletions: { "fxwatch:USD/THB": T(3) } }),
      NOW
    );
    expect(merged.fxWatchlist).toEqual([]);
  });

  it("keeps an alert's newer side: fired on one device beats an older edit on the other", () => {
    const fired = fxAlert("a1", T(6), { state: "fired", firedAt: "2026-11-06", firedRate: 33.4, seen: false });
    const merged = mergeBooks(book({ fxAlerts: [fxAlert("a1", T(4), { note: "edited" })] }), book({ fxAlerts: [fired] }), NOW);
    expect(merged.fxAlerts).toEqual([fired]);
  });

  it("drops a deleted alert, but keeps one edited after the deletion", () => {
    const merged = mergeBooks(
      book({ fxAlerts: [fxAlert("gone", T(2)), fxAlert("kept", T(8))] }),
      book({ deletions: { "fxalert:gone": T(3), "fxalert:kept": T(5) } }),
      NOW
    );
    expect(merged.fxAlerts.map((a) => a.id)).toEqual(["kept"]);
  });

  it("merges with a book from a device that predates FX without losing FX data", () => {
    const legacy = book();
    delete (legacy as Partial<SyncBook>).fxWatchlist;
    delete (legacy as Partial<SyncBook>).fxAlerts;
    delete (legacy as Partial<SyncBook>).fxWatchlistOrderUpdatedAt;
    const current = book({ fxWatchlist: [fxWatch("USD/THB")], fxAlerts: [fxAlert("a1", T(2))] });
    const merged = mergeBooks(legacy, current, NOW);
    expect(merged.fxWatchlist.map((w) => w.pair)).toEqual(["USD/THB"]);
    expect(merged.fxAlerts.map((a) => a.id)).toEqual(["a1"]);
    expect(mergeBooks(current, legacy, NOW)).toEqual(merged);
    expect(normalizeSyncBook(legacy).fxAlerts).toEqual([]);
  });
});

describe("cash deposits and devices in sync", () => {
  const deposit = (id: string, date: string, updatedAt = date): CashDeposit => ({
    id,
    date,
    currency: "THB",
    amount: 33_500,
    rate: 33.5,
    rateSource: "reference",
    rateDate: date.slice(0, 10),
    createdAt: date,
    updatedAt,
  });
  const device = (id: string, lastSeenAt: string, name = id): SyncDevice => ({
    id,
    name,
    addedAt: T(1),
    lastSeenAt,
    updatedAt: lastSeenAt,
  });

  it("keeps deposits made on two devices, oldest first", () => {
    const merged = mergeBooks(
      book({ cashDeposits: [deposit("d2", T(5))] }),
      book({ cashDeposits: [deposit("d1", T(3))] }),
      NOW
    );
    expect(merged.cashDeposits.map((d) => d.id)).toEqual(["d1", "d2"]);
  });

  it("drops a deposit removed on the other device", () => {
    const merged = mergeBooks(
      book({ cashDeposits: [deposit("d1", T(3))] }),
      book({ deletions: { "deposit:d1": T(4) } }),
      NOW
    );
    expect(merged.cashDeposits).toEqual([]);
  });

  it("takes the newest entry for a device and keeps a removed one gone until it syncs again", () => {
    const renamed = mergeBooks(
      book({ devices: [device("phone", T(3), "Old name")] }),
      book({ devices: [device("phone", T(6), "Top's iPhone")] }),
      NOW
    );
    expect(renamed.devices).toEqual([device("phone", T(6), "Top's iPhone")]);

    const removed = mergeBooks(book({ devices: [device("lost", T(3))] }), book({ deletions: { "device:lost": T(4) } }), NOW);
    expect(removed.devices).toEqual([]);

    const back = mergeBooks(book({ devices: [device("lost", T(5))] }), book({ deletions: { "device:lost": T(4) } }), NOW);
    expect(back.devices.map((d) => d.id)).toEqual(["lost"]);
  });

  it("merges symmetrically with deposits and devices", () => {
    const a = book({ cashDeposits: [deposit("d1", T(2))], devices: [device("mac", T(3))] });
    const b = book({ cashDeposits: [deposit("d2", T(2))], devices: [device("phone", T(4))] });
    expect(mergeBooks(a, b, NOW)).toEqual(mergeBooks(b, a, NOW));
  });

  it("reads a book from before deposits and devices existed", () => {
    const legacy = book();
    delete (legacy as Partial<SyncBook>).cashDeposits;
    delete (legacy as Partial<SyncBook>).devices;
    const merged = mergeBooks(legacy, book({ cashDeposits: [deposit("d1", T(2))] }), NOW);
    expect(merged.cashDeposits.map((d) => d.id)).toEqual(["d1"]);
    expect(normalizeSyncBook(legacy).devices).toEqual([]);
  });
});
