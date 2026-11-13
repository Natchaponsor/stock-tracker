"use client";

import { useCallback } from "react";
import { usePositionStore } from "@/store/usePositionStore";
import { useFxLatest } from "@/hooks/useFx";
import { formatCurrency, splitCents } from "@/lib/format";
import type { FxPair } from "@/lib/types";

/** The second currency the totals can show in: the home currency, or THB until one is set. */
export function useAltCurrency(): string {
  const home = usePositionStore((s) => s.homeCurrency);
  return home !== "USD" ? home : "THB";
}

/**
 * The dashboard totals' display currency. The book is kept in dollars; when the
 * user flips to their home currency, amounts convert at the latest daily
 * reference rate. Until that rate arrives (or if it can't), amounts stay in
 * dollars, so a number is never shown in the wrong currency.
 */
export function useDisplayCurrency() {
  const choice = usePositionStore((s) => s.displayCurrency);
  const setDisplayCurrency = usePositionStore((s) => s.setDisplayCurrency);
  const alt = useAltCurrency();
  const wantsAlt = choice === "home";
  const pair: FxPair = `USD/${alt}`;
  // Fetched even while showing dollars, so flipping is instant.
  const { rates, isLoading, hasError } = useFxLatest([pair]);
  const fx = rates?.[pair] ?? null;
  const converting = wantsAlt && fx !== null;
  const currency = converting ? alt : "USD";
  const rate = converting ? fx.rate : 1;

  const money = useCallback(
    (usd: number, opts: { signed?: boolean; compact?: boolean } = {}) => formatCurrency(usd * rate, { ...opts, currency }),
    [rate, currency]
  );
  const split = useCallback((usd: number) => splitCents(usd * rate, currency), [rate, currency]);

  return {
    /** The currency amounts are in right now. */
    currency,
    alt,
    /** The user asked for the second currency (it may still be loading). */
    wantsAlt,
    /** USD → alt rate and its date, when known. */
    fx,
    rateLoading: wantsAlt && fx === null && isLoading,
    rateMissing: wantsAlt && fx === null && !isLoading && (hasError || rates !== null),
    money,
    split,
    toggle: () => setDisplayCurrency(wantsAlt ? "USD" : "home"),
    setChoice: setDisplayCurrency,
  };
}
