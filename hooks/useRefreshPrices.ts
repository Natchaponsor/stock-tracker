"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { syncSoon } from "@/lib/sync/client";

/**
 * Taking a fix: the only thing in the app that ever triggers a quote fetch.
 * Nothing refreshes on a timer. With device sync on, it also pulls the book.
 */
export function useRefreshPrices() {
  const { mutate } = useSWRConfig();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    syncSoon();
    try {
      // Revalidates every active /api/quote SWR key at once (watchlist rows, position
      // rows, the running balance, allocation may each hold a different symbol
      // subset) — this is the only thing that ever triggers a quote fetch now.
      await mutate((key) => typeof key === "string" && key.startsWith("/api/quote"));
    } finally {
      setRefreshing(false);
    }
  }

  return { refresh, refreshing };
}
