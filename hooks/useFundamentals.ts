"use client";

import useSWR from "swr";
import type { Fundamentals } from "@/lib/types";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`fundamentals fetch failed: ${res.status}`);
    return res.json() as Promise<Fundamentals[]>;
  });

export function useFundamentals(symbol: string | null) {
  const key = symbol ? `/api/fundamentals?symbols=${symbol}` : null;

  const { data, error, isLoading } = useSWR<Fundamentals[]>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 5000,
    errorRetryInterval: 30000,
    errorRetryCount: 2,
  });

  return { fundamentals: data?.[0] ?? null, isLoading, hasError: Boolean(error) };
}
