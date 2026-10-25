"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { usePositionStore } from "@/store/usePositionStore";
import { WatchlistCard } from "./WatchlistCard";
import { EmptyEntry } from "@/components/log/Band";
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
    <div>
      {watchlist.length === 0 ? (
        <EmptyEntry
          title="Nothing on watch"
          description="Add a symbol to keep it on the sheet without holding any of it."
        />
      ) : (
        <div>
          {watchlist.map((item) => (
            <WatchlistCard key={item.symbol} item={item} />
          ))}
        </div>
      )}

      {watchlist.length < MAX_WATCHLIST_SYMBOLS && (
        <form onSubmit={handleAdd} className="mt-4 flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add symbol (e.g. MSFT)"
            aria-label="Add a symbol to the watchlist"
            className="h-8 w-44 border border-rule-strong bg-panel px-2.5 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <button
            type="submit"
            className="stamp flex h-8 items-center gap-1.5 border border-rule-strong px-2.5 text-fg-muted transition-colors hover:text-fg"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </form>
      )}
    </div>
  );
}
