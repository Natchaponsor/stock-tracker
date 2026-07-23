"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { generateSeedPositions, generateSeedStrategies, generateSeedWatchlist } from "@/lib/seed";
import { DEFAULT_STARTING_CASH } from "@/lib/cash";
import type { ExportPayload, Fill, JournalNote, Position, Strategy, WatchlistItem } from "@/lib/types";

interface PositionState {
  positions: Position[];
  strategies: Strategy[];
  watchlist: WatchlistItem[];
  startingCash: number;
  hidePnl: boolean;
  hasHydrated: boolean;
  /** True once the store has ever been seeded or explicitly erased — guards against
   * re-seeding demo data after the user intentionally erases everything. */
  initialized: boolean;

  setHasHydrated: (v: boolean) => void;
  seedIfNeeded: () => void;
  resetDemo: () => void;
  eraseAll: () => void;
  importData: (payload: ExportPayload) => void;
  setStartingCash: (amount: number) => void;

  addPosition: (position: Position) => void;
  updatePosition: (id: string, patch: Partial<Position>) => void;
  deletePosition: (id: string) => void;
  closePosition: (id: string) => void;

  addFill: (positionId: string, kind: "entry" | "exit", fill: Fill) => void;
  addNote: (positionId: string, note: JournalNote) => void;

  addStrategy: (strategy: Strategy) => void;
  updateStrategy: (id: string, patch: Partial<Strategy>) => void;
  deleteStrategy: (id: string) => void;

  addWatchlistSymbol: (symbol: string, note?: string) => void;
  removeWatchlistSymbol: (symbol: string) => void;

  toggleHidePnl: () => void;
}

export const usePositionStore = create<PositionState>()(
  persist(
    (set, get) => ({
      positions: [],
      strategies: [],
      watchlist: [],
      startingCash: 0,
      hidePnl: false,
      hasHydrated: false,
      initialized: false,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      seedIfNeeded: () => {
        if (!get().initialized) {
          get().resetDemo();
        }
      },

      resetDemo: () =>
        set({
          positions: generateSeedPositions(),
          strategies: generateSeedStrategies(),
          watchlist: generateSeedWatchlist(),
          startingCash: DEFAULT_STARTING_CASH,
          initialized: true,
        }),

      eraseAll: () =>
        set({
          positions: [],
          strategies: [],
          watchlist: [],
          startingCash: 0,
          initialized: true,
        }),

      importData: (payload) =>
        set({
          positions: payload.positions,
          strategies: payload.strategies,
          watchlist: payload.watchlist,
          startingCash: payload.startingCash,
          initialized: true,
        }),

      setStartingCash: (amount) => set({ startingCash: amount }),

      addPosition: (position) => set((state) => ({ positions: [...state.positions, position] })),

      updatePosition: (id, patch) =>
        set((state) => ({
          positions: state.positions.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
          ),
        })),

      deletePosition: (id) => set((state) => ({ positions: state.positions.filter((p) => p.id !== id) })),

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

      addStrategy: (strategy) => set((state) => ({ strategies: [...state.strategies, strategy] })),

      updateStrategy: (id, patch) =>
        set((state) => ({
          strategies: state.strategies.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),

      deleteStrategy: (id) =>
        set((state) => ({ strategies: state.strategies.filter((s) => s.id !== id) })),

      addWatchlistSymbol: (symbol, note) =>
        set((state) => {
          const upper = symbol.toUpperCase();
          if (state.watchlist.some((w) => w.symbol === upper)) return state;
          return {
            watchlist: [...state.watchlist, { symbol: upper, addedAt: new Date().toISOString(), note }],
          };
        }),

      removeWatchlistSymbol: (symbol) =>
        set((state) => ({ watchlist: state.watchlist.filter((w) => w.symbol !== symbol) })),

      toggleHidePnl: () => set({ hidePnl: !get().hidePnl }),
    }),
    {
      name: "stock-tracker-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        positions: state.positions,
        strategies: state.strategies,
        watchlist: state.watchlist,
        startingCash: state.startingCash,
        hidePnl: state.hidePnl,
        initialized: state.initialized,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.seedIfNeeded();
        state.setHasHydrated(true);
      },
    }
  )
);
