"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { usePositionStore } from "@/store/usePositionStore";
import { WatchlistCard } from "./WatchlistCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MAX_WATCHLIST_SYMBOLS } from "@/lib/constants";

export function WatchlistStrip() {
  const watchlist = usePositionStore((s) => s.watchlist);
  const addWatchlistSymbol = usePositionStore((s) => s.addWatchlistSymbol);
  const [draft, setDraft] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const symbol = draft.trim().toUpperCase();
    if (!symbol || watchlist.length >= MAX_WATCHLIST_SYMBOLS) return;
    addWatchlistSymbol(symbol);
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {watchlist.map((item) => (
          <WatchlistCard key={item.symbol} item={item} />
        ))}
      </div>

      {watchlist.length === 0 && (
        <EmptyState title="Nothing on your watchlist yet" description="Add a symbol to start tracking its signal state." />
      )}

      {watchlist.length < MAX_WATCHLIST_SYMBOLS && (
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add symbol (e.g. MSFT)"
            className="h-9 w-48 rounded-lg border border-border bg-panel px-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-panel px-3 text-sm font-medium text-fg-muted hover:text-fg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </form>
      )}
    </div>
  );
}
