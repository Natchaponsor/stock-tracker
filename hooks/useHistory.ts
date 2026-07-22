"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { computeTrendState, ema } from "@/lib/indicators";
import { EMA_FAST_PERIOD, EMA_SLOW_PERIOD } from "@/lib/constants";
import type { DailyBar } from "@/lib/types";

interface HistoryResponse {
  symbol: string;
  bars: DailyBar[];
  error?: string;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`history fetch failed: ${res.status}`);
    return res.json() as Promise<HistoryResponse>;
  });

export function useHistory(symbol: string | null) {
  const key = symbol ? `/api/history?symbol=${symbol}` : null;
  const { data, error, isLoading } = useSWR<HistoryResponse>(key, fetcher, {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
    errorRetryInterval: 30000,
    errorRetryCount: 2,
  });

  const bars = useMemo(() => data?.bars ?? [], [data]);
  const closes = useMemo(() => bars.map((b) => b.close), [bars]);

  const fast = useMemo(() => ema(closes, EMA_FAST_PERIOD), [closes]);
  const slow = useMemo(() => ema(closes, EMA_SLOW_PERIOD), [closes]);
  const trend = useMemo(() => computeTrendState(closes, bars, EMA_FAST_PERIOD, EMA_SLOW_PERIOD), [closes, bars]);

  const hasEnoughData = bars.length >= EMA_SLOW_PERIOD / 2;

  return {
    bars,
    closes,
    fast,
    slow,
    trend,
    hasEnoughData,
    isLoading,
    hasError: Boolean(error) || Boolean(data?.error),
  };
}
