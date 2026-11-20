"use client";

import { useEffect, useMemo, useState } from "react";
import { mergeBars, planFetch, type CachedBars } from "@/lib/priceHistory";
import type { DailyBar } from "@/lib/types";

/** This device's daily bars, by symbol. A cache only: never synced, safe to lose. */
const STORAGE_KEY = "stock-tracker-bars";
/** Requests in flight at once, to stay well inside the provider's per-hour limits. */
const CONCURRENCY = 3;

interface HistoryResponse {
  symbol: string;
  bars: DailyBar[];
  error?: string;
}

function readCache(): Record<string, CachedBars> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, CachedBars>) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CachedBars>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or blocked: the bars still work for this visit.
  }
}

function pick(cache: Record<string, CachedBars>, symbols: string[]): Map<string, DailyBar[]> {
  const out = new Map<string, DailyBar[]>();
  for (const s of symbols) if (cache[s]) out.set(s, cache[s].bars);
  return out;
}

export interface PriceHistory {
  /** Raw daily bars by symbol, oldest first. */
  bars: Map<string, DailyBar[]>;
  loading: boolean;
  /** Symbols whose latest request failed, with why. Cached bars, if any, are still in `bars`. */
  errors: Record<string, string>;
  /** No price provider key is set on the server. */
  needsKey: boolean;
}

/**
 * Daily bars for each symbol from the day given (`need`: symbol → YYYY-MM-DD).
 * Bars this device already has are used straight away; only missing days are
 * requested, a few symbols at a time, and the result is saved for next time.
 */
export function usePriceHistory(need: Record<string, string>): PriceHistory {
  const key = useMemo(
    () =>
      Object.entries(need)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([s, d]) => `${s}@${d}`)
        .join(","),
    [need]
  );

  const symbols = useMemo(() => (key ? key.split(",").map((pair) => pair.split("@")[0]) : []), [key]);
  // Which request set has finished, and bumped when fresh bars are saved so they're read back.
  const [done, setDone] = useState<{ key: string; errors: Record<string, string> } | null>(null);

  // What this device already has shows straight away, before any request returns.
  const bars = useMemo(
    () => pick(readCache(), symbols),
    // `done` changes when new bars are saved, so the cache is read again then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [symbols, done]
  );

  useEffect(() => {
    let cancelled = false;
    const wanted = key ? key.split(",").map((pair) => pair.split("@") as [string, string]) : [];
    const cache = readCache();
    const now = new Date();
    const queue = wanted
      .map(([symbol, day]) => ({ symbol, day, from: planFetch(cache[symbol], day, now) }))
      .filter((job): job is { symbol: string; day: string; from: string } => job.from !== null);

    const errors: Record<string, string> = {};

    async function worker() {
      for (let job = queue.shift(); job; job = queue.shift()) {
        try {
          const res = await fetch(`/api/history?symbol=${encodeURIComponent(job.symbol)}&from=${job.from}`);
          const data = (await res.json()) as HistoryResponse;
          if (data.error) {
            errors[job.symbol] = data.error;
            continue;
          }
          const prior = cache[job.symbol];
          const covers = prior !== undefined && prior.from <= job.day;
          cache[job.symbol] = {
            from: covers ? prior.from : job.day,
            bars: mergeBars(prior?.bars ?? [], data.bars),
            fetchedAt: new Date().toISOString(),
          };
        } catch {
          errors[job.symbol] = "fetch failed";
        }
      }
    }

    const jobs = queue.length;
    Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs) }, worker)).then(() => {
      if (jobs > 0) {
        // Keep bars another tab saved meanwhile, then add ours.
        const ours = Object.fromEntries(wanted.filter(([s]) => cache[s]).map(([s]) => [s, cache[s]]));
        writeCache({ ...readCache(), ...ours });
      }
      if (!cancelled) setDone({ key, errors });
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  const current = done?.key === key ? done : null;
  const errors = current?.errors ?? {};
  return {
    bars,
    loading: current === null,
    errors,
    needsKey: Object.values(errors).some((e) => e.startsWith("missing ")),
  };
}
