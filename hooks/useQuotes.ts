"use client";

import useSWR from "swr";
import type { Quote } from "@/lib/types";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`quote fetch failed: ${res.status}`);
    return res.json() as Promise<Quote[]>;
  });

export function useQuotes(symbols: string[]) {
  const key = symbols.length > 0 ? `/api/quote?symbols=${symbols.slice().sort().join(",")}` : null;

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
