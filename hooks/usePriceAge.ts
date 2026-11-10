"use client";

import { useQuotes } from "@/hooks/useQuotes";
import { capitalize } from "@/lib/format";
import { formatPriceAge } from "@/lib/priceTime";
import { useNow } from "@/components/log/clock";

const NO_EXTRA_SYMBOLS: string[] = [];

/** How old the prices are, in plain words: "Prices as of 1:00 PM · 10 hr ago". */
export function usePriceAge(): { text: string; short?: string; title?: string } {
  const { quotes, isLoading, hasError } = useQuotes(NO_EXTRA_SYMBOLS);
  const now = useNow();

  let latest: number | null = null;
  for (const quote of quotes.values()) {
    if (quote.price === null || !quote.asOf) continue;
    const t = new Date(quote.asOf).getTime();
    if (Number.isFinite(t) && (latest === null || t > latest)) latest = t;
  }

  if (latest !== null) {
    const age = formatPriceAge(new Date(latest), now === null ? null : new Date(now));
    return { text: `Prices ${age}`, short: capitalize(age), title: new Date(latest).toLocaleString() };
  }
  if (hasError) return { text: "Prices unavailable" };
  if (isLoading && quotes.size === 0) return { text: "Loading prices…" };
  if (quotes.size === 0) return { text: "No stocks to price yet" };
  return { text: "Waiting for prices" };
}
