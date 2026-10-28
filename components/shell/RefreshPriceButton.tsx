"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Taking a fix: the only thing in the app that ever triggers a quote fetch.
 * Nothing refreshes on a timer, and the label says so.
 */
export function RefreshPriceButton({ onAccent = false }: { onAccent?: boolean }) {
  const { mutate } = useSWRConfig();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      // Revalidates every active /api/quote SWR key at once (watchlist rows, position
      // rows, the running balance, allocation may each hold a different symbol
      // subset) — this is the only thing that ever triggers a quote fetch now.
      await mutate((key) => typeof key === "string" && key.startsWith("/api/quote"));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={refreshing}
      title="Fetch current prices now — nothing refreshes automatically in the background"
      aria-label={refreshing ? "Refreshing prices" : "Refresh prices"}
      className={cn(
        "stamp flex h-7 items-center gap-1.5 border px-2.5 transition-colors disabled:opacity-60",
        // On the accent band the global accent focus ring would be invisible,
        // so the ring switches to the band's own ink.
        onAccent
          ? "border-on-accent/30 text-on-accent hover:border-on-accent focus-visible:outline-on-accent"
          : "border-rule-strong text-fg-muted hover:text-fg"
      )}
    >
      <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
      {/* Icon-only on phones so the price line beside it keeps its time and age. */}
      <span className="hidden sm:inline">{refreshing ? "Refreshing…" : "Refresh prices"}</span>
    </button>
  );
}
