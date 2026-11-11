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
