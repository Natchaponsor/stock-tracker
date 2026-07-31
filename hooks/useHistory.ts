"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { averageVolume, computeTrendState, ema, macd, rsi } from "@/lib/indicators";
import {
  EMA_FAST_PERIOD,
  EMA_SLOW_PERIOD,
  MACD_FAST_PERIOD,
  MACD_SIGNAL_PERIOD,
  MACD_SLOW_PERIOD,
  RSI_PERIOD,
  VOLUME_AVG_PERIOD,
} from "@/lib/constants";
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

  // Daily bars barely move intraday, so this only fetches on mount (and again
  // if the symbol changes) — no polling, matching useQuotes' call-volume policy.
  const { data, error, isLoading } = useSWR<HistoryResponse>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 5 * 60 * 1000,
    errorRetryInterval: 30000,
    errorRetryCount: 2,
  });

  const bars = useMemo(() => data?.bars ?? [], [data]);
  const closes = useMemo(() => bars.map((b) => b.close), [bars]);
  const volumes = useMemo(() => bars.map((b) => b.volume), [bars]);

  const fast = useMemo(() => ema(closes, EMA_FAST_PERIOD), [closes]);
  const slow = useMemo(() => ema(closes, EMA_SLOW_PERIOD), [closes]);
  const trend = useMemo(() => computeTrendState(closes, bars, EMA_FAST_PERIOD, EMA_SLOW_PERIOD), [closes, bars]);

  const rsiSeries = useMemo(() => rsi(closes, RSI_PERIOD), [closes]);
  const macdResult = useMemo(
    () => macd(closes, MACD_FAST_PERIOD, MACD_SLOW_PERIOD, MACD_SIGNAL_PERIOD),
    [closes]
  );
  const volumeAvg = useMemo(() => averageVolume(volumes, VOLUME_AVG_PERIOD), [volumes]);

  const latestRsi = rsiSeries.length > 0 ? rsiSeries[rsiSeries.length - 1] : null;
  const latestVolume = volumes.length > 0 ? volumes[volumes.length - 1] : null;
  const latestVolumeAvg = volumeAvg.length > 0 ? volumeAvg[volumeAvg.length - 1] : null;

  const hasEnoughData = bars.length >= EMA_SLOW_PERIOD / 2;

  return {
    bars,
    closes,
    fast,
    slow,
    trend,
    rsiSeries,
    latestRsi,
    macd: macdResult,
    latestVolume,
    latestVolumeAvg,
    hasEnoughData,
    isLoading,
    hasError: Boolean(error) || Boolean(data?.error),
  };
}
