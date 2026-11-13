"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { FxBar, FxNewsItem, FxPair } from "@/lib/types";

const fetcher = <T,>(url: string) =>
  fetch(url).then(async (res) => {
    const body = (await res.json().catch(() => null)) as T | null;
    if (!res.ok || !body) throw new Error(`fx fetch failed: ${res.status}`);
    return body;
  });

// Daily reference rates: fetch on mount only, no polling (the app's weekly rhythm).
const SWR_OPTIONS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 10 * 60 * 1000,
  errorRetryCount: 2,
  errorRetryInterval: 30_000,
};

interface HistoryResponse {
  bars: FxBar[];
  error?: string;
}

/** Daily fixes for `pair` over the last `days` days, oldest first. `provider` narrows to one source (e.g. BOT). */
export function useFxHistory(pair: FxPair | null, days: number, provider?: string) {
  const key = pair
    ? `/api/fx/history?pair=${encodeURIComponent(pair)}&days=${days}${provider ? `&provider=${provider}` : ""}`
    : null;
  const { data, error, isLoading } = useSWR<HistoryResponse>(key, fetcher<HistoryResponse>, SWR_OPTIONS);
  const bars = useMemo(() => data?.bars ?? [], [data]);
  return {
    bars,
    latest: bars.length > 0 ? bars[bars.length - 1] : null,
    isLoading,
    hasError: Boolean(error) || Boolean(data?.error),
  };
}

interface NewsResponse {
  items: FxNewsItem[];
  error?: string;
}

export function useFxNews(currencies: string[]) {
  const key = currencies.length > 0 ? `/api/fx/news?currencies=${currencies.join(",")}` : null;
  const { data, error, isLoading } = useSWR<NewsResponse>(key, fetcher<NewsResponse>, SWR_OPTIONS);
  return { items: data?.items ?? [], isLoading, hasError: Boolean(error) || Boolean(data?.error) };
}

interface LatestResponse {
  rates: Record<string, { rate: number; date: string }>;
}

/** The latest fix for each pair, in one request. */
export function useFxLatest(pairs: FxPair[]) {
  const key = pairs.length > 0 ? `/api/fx/latest?pairs=${encodeURIComponent([...pairs].sort().join(","))}` : null;
  const { data, error, isLoading } = useSWR<LatestResponse>(key, fetcher<LatestResponse>, SWR_OPTIONS);
  return { rates: data?.rates ?? null, isLoading, hasError: Boolean(error) };
}

interface RateOnResponse {
  pair: string;
  date: string | null;
  rate: number | null;
  error?: string;
}

/**
 * The daily reference rate for `pair` on `date` (YYYY-MM-DD), or the last fix
 * before it. `fix.date` is the day of the fix actually used.
 */
export function useFxRateOn(pair: FxPair | null, date: string | null) {
  const key = pair && date ? `/api/fx/rate?pair=${encodeURIComponent(pair)}&date=${date}` : null;
  const { data, error, isLoading } = useSWR<RateOnResponse>(key, fetcher<RateOnResponse>, {
    ...SWR_OPTIONS,
    // A missing rate is an answer, not a blip: don't keep asking.
    shouldRetryOnError: false,
  });
  const fix = data && data.rate !== null && data.date !== null ? { rate: data.rate, date: data.date } : null;
  return { fix, isLoading, hasError: Boolean(error) || Boolean(data?.error) };
}
