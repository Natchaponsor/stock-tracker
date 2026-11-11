"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { generateSeedPositions, generateSeedStrategies, generateSeedWatchlist } from "@/lib/seed";
import { DEFAULT_STARTING_CASH } from "@/lib/cash";
import { migratePositionShape } from "@/lib/migratePosition";
import { orderByKeys } from "@/lib/reorder";
import {
  deletionKey,
  normalizeSector,
  normalizeStrategy,
  normalizeWatchItem,
  type DeletionKind,
  type SyncBook,
} from "@/lib/sync/book";
import type { CustomSector, ExportPayload, Fill, JournalNote, Position, Strategy, WatchlistItem } from "@/lib/types";

interface PositionState {
  positions: Position[];
  strategies: Strategy[];
  watchlist: WatchlistItem[];
  /** User-named sectors. A symbol listed here overrides the built-in sector table. */
  customSectors: CustomSector[];
  startingCash: number;
  /** Device-sync bookkeeping (see lib/sync/book.ts): when starting cash and the
   * watchlist order last changed, and tombstones for deleted items. */
  startingCashUpdatedAt: string | null;
  watchlistOrderUpdatedAt: string | null;
  deletions: Record<string, string>;
  hidePnl: boolean;
  hasHydrated: boolean;
  /** True once the store has ever been seeded or explicitly erased — guards against
   * re-seeding demo data after the user intentionally erases everything. */
  initialized: boolean;
  /** When the book was last exported as JSON (its only backup), or null if never. */
  lastExportedAt: string | null;
  /** When this book began: first load, reset, erase or import. Starts the backup
   * reminder's clock for a book that has never been exported. */
  bookStartedAt: string | null;

  setHasHydrated: (v: boolean) => void;
  seedIfNeeded: () => void;
  resetDemo: () => void;
  eraseAll: () => void;
  importData: (payload: ExportPayload) => void;
  setStartingCash: (amount: number) => void;
  markExported: () => void;

  addPosition: (position: Position) => void;
  updatePosition: (id: string, patch: Partial<Position>) => void;
  deletePosition: (id: string) => void;
  closePosition: (id: string) => void;

  addFill: (positionId: string, kind: "entry" | "exit", fill: Fill) => void;
  addNote: (positionId: string, note: JournalNote) => void;

  /** Replaces the synced part of the book with a merged copy from device sync. */
  applySynced: (book: SyncBook) => void;

  addStrategy: (strategy: Omit<Strategy, "updatedAt">) => void;
  updateStrategy: (id: string, patch: Partial<Strategy>) => void;
  deleteStrategy: (id: string) => void;

  addWatchlistSymbol: (symbol: string, note?: string) => void;
  removeWatchlistSymbol: (symbol: string) => void;
  /** Persists a new watchlist order, given as the symbols in display order. */
  reorderWatchlist: (symbols: string[]) => void;

  /** Creates or updates a custom sector. Its symbols leave any other custom sector,
   * so every symbol belongs to at most one. */
  saveCustomSector: (sector: Omit<CustomSector, "updatedAt">) => void;
  deleteCustomSector: (id: string) => void;

  toggleHidePnl: () => void;
}

/** Brings a saved book of any older version up to the current shape. Exported for tests. */
export function migratePersistedBook(persisted: unknown) {
  const state = persisted as {
    positions?: unknown[];
    strategies?: Strategy[];
    watchlist?: WatchlistItem[];
    customSectors?: CustomSector[];
  };
  if (Array.isArray(state.positions)) {
    state.positions = state.positions.map((p) => migratePositionShape(p as Record<string, unknown>));
  }
  if (Array.isArray(state.strategies)) state.strategies = state.strategies.map(normalizeStrategy);
  if (Array.isArray(state.watchlist)) state.watchlist = state.watchlist.map(normalizeWatchItem);
  if (Array.isArray(state.customSectors)) state.customSectors = state.customSectors.map(normalizeSector);
  return persisted as Partial<PositionState>;
}

const nowIso = () => new Date().toISOString();

/** Records a deletion so device sync removes the item on other devices too. */
function tombstone(deletions: Record<string, string>, kind: DeletionKind, key: string) {
  return { ...deletions, [deletionKey(kind, key)]: nowIso() };
}

function withoutTombstone(deletions: Record<string, string>, kind: DeletionKind, key: string) {
  const k = deletionKey(kind, key);
  if (!(k in deletions)) return deletions;
  const next = { ...deletions };
  delete next[k];
  return next;
}

/**
 * Swaps the whole book (reset, erase, import). Everything that disappears gets a
 * tombstone and everything that arrives is stamped now, so with sync on the
 * change reaches the other devices as one consistent replacement.
 */
function replaceBook(
  state: PositionState,
  next: Pick<PositionState, "positions" | "strategies" | "watchlist" | "customSectors" | "startingCash">
): Partial<PositionState> {
  const at = nowIso();
  const deletions = { ...state.deletions };
  const swap = <T,>(kind: DeletionKind, before: T[], after: T[], keyOf: (item: T) => string) => {
    const keep = new Set(after.map(keyOf));
    for (const item of before) if (!keep.has(keyOf(item))) deletions[deletionKey(kind, keyOf(item))] = at;
    for (const key of keep) delete deletions[deletionKey(kind, key)];
  };
  swap("position", state.positions, next.positions, (p) => p.id);
  swap("strategy", state.strategies, next.strategies, (s) => s.id);
  swap("watch", state.watchlist, next.watchlist, (w) => w.symbol);
  swap("sector", state.customSectors, next.customSectors, (c) => c.id);
  return {
    positions: next.positions.map((p) => ({ ...p, updatedAt: at })),
    strategies: next.strategies.map((s) => ({ ...s, updatedAt: at })),
    watchlist: next.watchlist.map((w) => ({ ...w, updatedAt: at })),
    customSectors: next.customSectors.map((c) => ({ ...c, updatedAt: at })),
    startingCash: next.startingCash,
    startingCashUpdatedAt: at,
    watchlistOrderUpdatedAt: at,
    deletions,
  };
}

export const usePositionStore = create<PositionState>()(
  persist(
    (set, get) => ({
      positions: [],
      strategies: [],
      watchlist: [],
      customSectors: [],
      startingCash: 0,
      startingCashUpdatedAt: null,
      watchlistOrderUpdatedAt: null,
      deletions: {},
      hidePnl: false,
      hasHydrated: false,
      initialized: false,
      lastExportedAt: null,
      bookStartedAt: null,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      seedIfNeeded: () => {
        if (!get().initialized) {
          get().resetDemo();
        } else if (get().bookStartedAt === null) {
          // A book from before the backup reminder existed: start its clock now.
          set({ bookStartedAt: new Date().toISOString() });
        }
      },

      resetDemo: () =>
        set((state) => ({
          ...replaceBook(state, {
            positions: generateSeedPositions(),
            strategies: generateSeedStrategies(),
            watchlist: generateSeedWatchlist(),
            customSectors: [],
            startingCash: DEFAULT_STARTING_CASH,
          }),
          initialized: true,
          bookStartedAt: nowIso(),
        })),

      eraseAll: () =>
        set((state) => ({
          ...replaceBook(state, { positions: [], strategies: [], watchlist: [], customSectors: [], startingCash: 0 }),
          initialized: true,
          bookStartedAt: nowIso(),
        })),

      importData: (payload) =>
        set((state) => ({
          ...replaceBook(state, {
            positions: payload.positions,
            strategies: payload.strategies,
            watchlist: payload.watchlist,
            customSectors: payload.customSectors,
            startingCash: payload.startingCash,
          }),
          initialized: true,
          bookStartedAt: nowIso(),
        })),

      applySynced: (book) =>
        set({
          positions: book.positions,
          strategies: book.strategies,
          watchlist: book.watchlist,
          customSectors: book.customSectors,
          startingCash: book.startingCash,
          startingCashUpdatedAt: book.startingCashUpdatedAt,
          watchlistOrderUpdatedAt: book.watchlistOrderUpdatedAt,
          deletions: book.deletions,
          // A synced book is a real book: never reseed demo data over it.
          initialized: true,
        }),

      setStartingCash: (amount) => set({ startingCash: amount, startingCashUpdatedAt: nowIso() }),

      markExported: () => set({ lastExportedAt: new Date().toISOString() }),

      addPosition: (position) =>
        set((state) => ({
          positions: [...state.positions, { ...position, updatedAt: nowIso() }],
          deletions: withoutTombstone(state.deletions, "position", position.id),
        })),

      updatePosition: (id, patch) =>
        set((state) => ({
          positions: state.positions.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
          ),
        })),

      deletePosition: (id) =>
        set((state) => ({
          positions: state.positions.filter((p) => p.id !== id),
          deletions: tombstone(state.deletions, "position", id),
        })),

      closePosition: (id) =>
        set((state) => ({
          positions: state.positions.map((p) =>
            p.id === id ? { ...p, status: "closed", updatedAt: new Date().toISOString() } : p
          ),
        })),

      addFill: (positionId, kind, fill) =>
        set((state) => ({
          positions: state.positions.map((p) => {
            if (p.id !== positionId) return p;
            const key = kind === "entry" ? "entries" : "exits";
            return { ...p, [key]: [...p[key], fill], updatedAt: new Date().toISOString() };
          }),
        })),

      addNote: (positionId, note) =>
        set((state) => ({
          positions: state.positions.map((p) =>
            p.id === positionId
              ? { ...p, notes: [...p.notes, note], updatedAt: new Date().toISOString() }
              : p
          ),
        })),

      addStrategy: (strategy) =>
        set((state) => ({
          strategies: [...state.strategies, { ...strategy, updatedAt: nowIso() }],
          deletions: withoutTombstone(state.deletions, "strategy", strategy.id),
        })),

      updateStrategy: (id, patch) =>
        set((state) => ({
          strategies: state.strategies.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: nowIso() } : s)),
        })),

      deleteStrategy: (id) =>
        set((state) => ({
          strategies: state.strategies.filter((s) => s.id !== id),
          deletions: tombstone(state.deletions, "strategy", id),
        })),

      addWatchlistSymbol: (symbol, note) =>
        set((state) => {
          const upper = symbol.toUpperCase();
          if (state.watchlist.some((w) => w.symbol === upper)) return state;
          const at = nowIso();
          return {
            watchlist: [...state.watchlist, { symbol: upper, addedAt: at, updatedAt: at, note }],
            deletions: withoutTombstone(state.deletions, "watch", upper),
          };
        }),

      removeWatchlistSymbol: (symbol) =>
        set((state) => ({
          watchlist: state.watchlist.filter((w) => w.symbol !== symbol),
          deletions: tombstone(state.deletions, "watch", symbol),
        })),

      reorderWatchlist: (symbols) =>
        set((state) => ({
          watchlist: orderByKeys(state.watchlist, symbols, (w) => w.symbol),
          watchlistOrderUpdatedAt: nowIso(),
        })),

      saveCustomSector: (sector) =>
        set((state) => {
          const at = nowIso();
          const symbols = new Set(sector.symbols);
          const others = state.customSectors
            .filter((c) => c.id !== sector.id)
            .map((c) => {
              const kept = c.symbols.filter((s) => !symbols.has(s));
              // A sector that lost a symbol changed too, so sync must carry it.
              return kept.length === c.symbols.length ? c : { ...c, symbols: kept, updatedAt: at };
            });
          const existing = state.customSectors.findIndex((c) => c.id === sector.id);
          const next = [...others];
          next.splice(existing === -1 ? next.length : existing, 0, { ...sector, updatedAt: at });
          return { customSectors: next, deletions: withoutTombstone(state.deletions, "sector", sector.id) };
        }),

      deleteCustomSector: (id) =>
        set((state) => ({
          customSectors: state.customSectors.filter((c) => c.id !== id),
          deletions: tombstone(state.deletions, "sector", id),
        })),

      toggleHidePnl: () => set({ hidePnl: !get().hidePnl }),
    }),
    {
      name: "stock-tracker-store",
      // v1: Position.strategyId (single) -> strategyIds[] + customTags[]
      // v2: updatedAt on strategies, watchlist and custom sectors, for device sync
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        positions: state.positions,
        strategies: state.strategies,
        watchlist: state.watchlist,
        customSectors: state.customSectors,
        startingCash: state.startingCash,
        startingCashUpdatedAt: state.startingCashUpdatedAt,
        watchlistOrderUpdatedAt: state.watchlistOrderUpdatedAt,
        deletions: state.deletions,
        hidePnl: state.hidePnl,
        initialized: state.initialized,
        lastExportedAt: state.lastExportedAt,
        bookStartedAt: state.bookStartedAt,
      }),
      migrate: (persisted) => migratePersistedBook(persisted),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.seedIfNeeded();
        state.setHasHydrated(true);
      },
    }
  )
);

/** The synced part of the store, for device sync. */
export function selectSyncBook(state: PositionState): SyncBook {
  return {
    positions: state.positions,
    strategies: state.strategies,
    watchlist: state.watchlist,
    customSectors: state.customSectors,
    startingCash: state.startingCash,
    startingCashUpdatedAt: state.startingCashUpdatedAt,
    watchlistOrderUpdatedAt: state.watchlistOrderUpdatedAt,
    deletions: state.deletions,
  };
}
