"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { generateSeedPositions, generateSeedStrategies, generateSeedWatchlist } from "@/lib/seed";
import type { Fill, JournalNote, Position, Strategy, WatchlistItem } from "@/lib/types";

interface PositionState {
  positions: Position[];
  strategies: Strategy[];
  watchlist: WatchlistItem[];
  hidePnl: boolean;
  hasHydrated: boolean;

  setHasHydrated: (v: boolean) => void;
  seedIfEmpty: () => void;
  resetDemo: () => void;

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
      hidePnl: false,
      hasHydrated: false,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      seedIfEmpty: () => {
        const { positions, strategies, watchlist } = get();
        if (positions.length === 0 && strategies.length === 0 && watchlist.length === 0) {
          set({
            positions: generateSeedPositions(),
            strategies: generateSeedStrategies(),
            watchlist: generateSeedWatchlist(),
          });
        }
      },

      resetDemo: () =>
        set({
          positions: generateSeedPositions(),
          strategies: generateSeedStrategies(),
          watchlist: generateSeedWatchlist(),
        }),

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
        hidePnl: state.hidePnl,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.seedIfEmpty();
        state.setHasHydrated(true);
      },
    }
  )
);
