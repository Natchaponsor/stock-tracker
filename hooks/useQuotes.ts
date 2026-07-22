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

  const { data, error, isLoading } = useSWR<Quote[]>(key, fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: false,
    dedupingInterval: 30000,
    errorRetryInterval: 15000,
    errorRetryCount: 3,
  });

  const quoteMap = new Map((data ?? []).map((q) => [q.symbol, q]));

  return { quotes: quoteMap, isLoading, hasError: Boolean(error) };
}
