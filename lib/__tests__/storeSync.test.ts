import { beforeEach, describe, expect, it, vi } from "vitest";
import { migratePersistedBook, selectSyncBook, usePositionStore } from "@/store/usePositionStore";

// The store persists to localStorage, which Node lacks. Hoisted above the import
// so the store finds this in-memory one when it is created.
vi.hoisted(() => {
  const items = new Map<string, string>();
  const memoryStorage = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, String(value)),
    removeItem: (key: string) => void items.delete(key),
    clear: () => items.clear(),
    key: (index: number) => Array.from(items.keys())[index] ?? null,
    get length() {
      return items.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: memoryStorage, configurable: true });
});

const store = usePositionStore;

describe("store sync bookkeeping", () => {
  beforeEach(() => {
    store.getState().eraseAll();
    store.setState({ deletions: {} });
  });

  it("records a tombstone when a watched symbol is removed, and clears it when re-added", () => {
    store.getState().addWatchlistSymbol("aapl");
    store.getState().removeWatchlistSymbol("AAPL");
    expect(store.getState().deletions["watch:AAPL"]).toBeDefined();

    store.getState().addWatchlistSymbol("AAPL");
    expect(store.getState().deletions["watch:AAPL"]).toBeUndefined();
    expect(store.getState().watchlist[0].updatedAt).toBeDefined();
  });

  it("stamps a strategy when it is added or edited, and tombstones it when deleted", () => {
    store.getState().addStrategy({ id: "s1", name: "Breakout", entryRule: "", exitRule: "", createdAt: "2026-01-01T00:00:00.000Z" });
    const added = store.getState().strategies[0].updatedAt;
    expect(added > "2026-01-01").toBe(true);

    store.getState().deleteStrategy("s1");
    expect(store.getState().deletions["strategy:s1"]).toBeDefined();
  });

  it("stamps a custom sector that loses a symbol to another sector", () => {
    store.getState().saveCustomSector({ id: "a", name: "A", swatch: "cat-food", symbols: ["NVDA", "AMD"] });
    store.setState({
      customSectors: store.getState().customSectors.map((c) => ({ ...c, updatedAt: "2026-01-01T00:00:00.000Z" })),
    });
    store.getState().saveCustomSector({ id: "b", name: "B", swatch: "cat-bills", symbols: ["NVDA"] });
    const a = store.getState().customSectors.find((c) => c.id === "a")!;
    expect(a.symbols).toEqual(["AMD"]);
    expect(a.updatedAt > "2026-01-01T00:00:00.000Z").toBe(true);
  });

  it("tombstones everything an erase removes, so paired devices lose it too", () => {
    store.getState().resetDemo();
    const ids = store.getState().positions.map((p) => p.id);
    store.getState().eraseAll();
    for (const id of ids) expect(store.getState().deletions[`position:${id}`]).toBeDefined();
    expect(store.getState().deletions["watch:AAPL"]).toBeDefined();
  });

  it("applies a synced book in one step without reseeding demo data", () => {
    const book = { ...selectSyncBook(store.getState()), startingCash: 4_321 };
    store.setState({ initialized: false });
    store.getState().applySynced(book);
    expect(store.getState().startingCash).toBe(4_321);
    expect(store.getState().initialized).toBe(true);
  });
});

describe("migratePersistedBook", () => {
  it("back-fills updatedAt on books saved before sync existed", () => {
    const migrated = migratePersistedBook({
      positions: [],
      strategies: [{ id: "s", name: "S", entryRule: "", exitRule: "", createdAt: "2026-02-01T00:00:00.000Z" }],
      watchlist: [{ symbol: "AAPL", addedAt: "2026-03-01T00:00:00.000Z" }],
      customSectors: [{ id: "c", name: "C", swatch: "cat-food", symbols: [] }],
    });
    expect(migrated.strategies?.[0].updatedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(migrated.watchlist?.[0].updatedAt).toBe("2026-03-01T00:00:00.000Z");
    expect(migrated.customSectors?.[0].updatedAt).toBeDefined();
  });
});

describe("FX store actions", () => {
  beforeEach(() => {
    store.getState().eraseAll();
    store.setState({ deletions: {}, homeCurrency: "USD" });
  });

  it("seeds the FX watchlist the first time a non-USD home currency is picked", () => {
    store.getState().setHomeCurrency("THB");
    expect(store.getState().fxWatchlist.map((w) => w.pair)).toEqual(["USD/THB", "EUR/THB", "JPY/THB", "GBP/THB"]);
    // Per-device: the home currency never travels with the book.
    expect(selectSyncBook(store.getState())).not.toHaveProperty("homeCurrency");
  });

  it("removes a pair with its alerts and tombstones both", () => {
    store.getState().addFxPair("USD/THB", "base-to-quote");
    store.getState().addFxAlert({ id: "a1", pair: "USD/THB", condition: { kind: "below", level: 33.5 }, repeat: "once" });
    store.getState().removeFxPair("USD/THB");
    const { fxWatchlist, fxAlerts, deletions } = store.getState();
    expect(fxWatchlist).toEqual([]);
    expect(fxAlerts).toEqual([]);
    expect(Object.keys(deletions).sort()).toEqual(["fxalert:a1", "fxwatch:USD/THB"]);
  });

  it("fires, dismisses and re-arms an alert", () => {
    store.getState().addFxAlert({ id: "a1", pair: "USD/THB", condition: { kind: "below", level: 33.5 }, repeat: "rearm" });
    store.getState().applyFxAlertTransitions([{ id: "a1", pair: "USD/THB", to: "fired", rate: 33.4, date: "2026-11-12" }]);
    expect(store.getState().fxAlerts[0]).toMatchObject({ state: "fired", firedRate: 33.4, seen: false });
    store.getState().dismissFxAlert("a1");
    expect(store.getState().fxAlerts[0].seen).toBe(true);
    store.getState().updateFxAlert("a1", { condition: { kind: "below", level: 33 } });
    expect(store.getState().fxAlerts[0]).toMatchObject({ state: "armed", firedAt: null, firedRate: null });
  });
});

describe("cash deposits and devices in the store", () => {
  beforeEach(() => {
    store.getState().eraseAll();
    store.setState({ deletions: {}, devices: [], cashDeposits: [] });
  });

  const deposit = {
    id: "c1",
    date: "2026-11-08T00:00:00.000Z",
    currency: "THB",
    amount: 33_515,
    rate: 33.515,
    rateSource: "reference" as const,
    rateDate: "2026-11-08",
  };

  it("stamps a deposit, travels with the sync book, and tombstones it on delete", () => {
    store.getState().addCashDeposit(deposit);
    const saved = store.getState().cashDeposits[0];
    expect(saved.updatedAt).toBeDefined();
    expect(selectSyncBook(store.getState()).cashDeposits).toEqual([saved]);

    store.getState().deleteCashDeposit("c1");
    expect(store.getState().cashDeposits).toEqual([]);
    expect(store.getState().deletions["deposit:c1"]).toBeDefined();
  });

  it("tombstones deposits an erase removes, and imports deposits from a file", () => {
    store.getState().addCashDeposit(deposit);
    store.getState().eraseAll();
    expect(store.getState().deletions["deposit:c1"]).toBeDefined();

    const now = new Date().toISOString();
    store.getState().importData({
      exportedAt: now,
      version: 4,
      startingCash: 0,
      positions: [],
      strategies: [],
      watchlist: [],
      customSectors: [],
      fxWatchlist: [],
      fxAlerts: [],
      cashDeposits: [{ ...deposit, createdAt: now, updatedAt: now }],
    });
    expect(store.getState().cashDeposits.map((d) => d.id)).toEqual(["c1"]);
    expect(store.getState().deletions["deposit:c1"]).toBeUndefined();
  });

  it("adds this device once and leaves a fresh entry alone, so syncing settles", () => {
    store.getState().touchDevice({ id: "dev1", name: "Mac · Safari" });
    const first = store.getState().devices;
    expect(first.map((d) => d.name)).toEqual(["Mac · Safari"]);

    store.getState().touchDevice({ id: "dev1", name: "Mac · Safari" });
    expect(store.getState().devices).toBe(first);

    store.getState().touchDevice({ id: "dev1", name: "Work Mac" });
    expect(store.getState().devices[0].name).toBe("Work Mac");
  });

  it("forgets every other device after a code change", () => {
    store.getState().touchDevice({ id: "me", name: "Mac" });
    store.getState().touchDevice({ id: "lost", name: "Old phone" });
    store.getState().forgetOtherDevices("me");
    expect(store.getState().devices.map((d) => d.id)).toEqual(["me"]);
    expect(store.getState().deletions["device:lost"]).toBeDefined();
  });

  it("never puts the display currency in the sync book", () => {
    store.getState().setDisplayCurrency("home");
    expect(Object.keys(selectSyncBook(store.getState()))).not.toContain("displayCurrency");
    store.getState().setDisplayCurrency("USD");
  });
});
