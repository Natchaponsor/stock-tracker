"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { usePositionStore } from "@/store/usePositionStore";
import type { Quote } from "@/lib/types";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`quote fetch failed: ${res.status}`);
    return res.json() as Promise<Quote[]>;
  });

/**
 * Symbols worth keeping fresh app-wide (open positions + watchlist). Every
 * useQuotes() call folds its own request into this shared set so components
 * mounted on the same page converge on one SWR key instead of each firing
 * its own /api/quote request for overlapping symbols.
 */
function useTrackedSymbols(): string[] {
  const positions = usePositionStore((s) => s.positions);
  const watchlist = usePositionStore((s) => s.watchlist);

  return useMemo(() => {
    const set = new Set<string>();
    for (const p of positions) if (p.status === "open") set.add(p.symbol);
    for (const w of watchlist) set.add(w.symbol);
    return Array.from(set).sort();
  }, [positions, watchlist]);
}

export function useQuotes(symbols: string[]) {
  const tracked = useTrackedSymbols();

  const merged = useMemo(() => {
    const set = new Set(tracked);
    for (const s of symbols) set.add(s);
    return Array.from(set).sort();
  }, [tracked, symbols]);

  const key = merged.length > 0 ? `/api/quote?symbols=${merged.join(",")}` : null;

  // Fetches once on mount, then only on an explicit "Refresh Current Price" click
  // (see RefreshPriceButton) — no background polling, to keep Finnhub call volume low.
  const { data, error, isLoading } = useSWR<Quote[]>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 5000,
    errorRetryInterval: 15000,
    errorRetryCount: 3,
  });

  const quoteMap = new Map((data ?? []).map((q) => [q.symbol, q]));

  return { quotes: quoteMap, isLoading, hasError: Boolean(error) };
}
