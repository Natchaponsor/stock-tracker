"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

export function RefreshPriceButton() {
  const { mutate } = useSWRConfig();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      // Revalidates every active /api/quote SWR key at once (watchlist cards, position
      // cards, portfolio overview, allocation chart may each hold a different symbol
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
      className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-panel px-2.5 text-sm font-medium text-fg-muted hover:text-fg transition-colors disabled:opacity-60"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
      {refreshing ? "Refreshing…" : "Refresh Current Price"}
    </button>
  );
}
