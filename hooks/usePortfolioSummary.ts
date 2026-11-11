"use client";

import { useMemo } from "react";
import { usePositionStore } from "@/store/usePositionStore";
import { useQuotes } from "@/hooks/useQuotes";
import { computeCashSummary } from "@/lib/cash";
import { computePositionsValue } from "@/lib/portfolio";
import { bestMover, computeDayChange } from "@/lib/dayChange";
import { computeAlerts } from "@/lib/alerts";
import { latestFixToken } from "@/components/log/fix";

/**
 * The headline numbers both dashboard headers show: the phone's silk header
 * and the web's summary banner read the same figures from here.
 */
export function usePortfolioSummary() {
  const startingCash = usePositionStore((s) => s.startingCash);
  const positions = usePositionStore((s) => s.positions);

  const openSymbols = useMemo(
    () => Array.from(new Set(positions.filter((p) => p.status === "open").map((p) => p.symbol))),
    [positions]
  );
  const { quotes } = useQuotes(openSymbols);

  return useMemo(() => {
    const cash = computeCashSummary(startingCash, positions).cash;
    const portfolio = computePositionsValue(positions, quotes);
    const total = cash + portfolio.positionsValue;
    // Change from capital: today's balance against the cash you started with.
    // That difference is everything realized plus everything still open.
    const changeFromCapital = total - startingCash;
    return {
      startingCash,
      cash,
      total,
      positionsValue: portfolio.positionsValue,
      positionsWithoutPrice: portfolio.positionsWithoutPrice,
      openCount: positions.filter((p) => p.status === "open").length,
      changeFromCapital,
      changePct: startingCash > 0 ? changeFromCapital / startingCash : null,
      day: computeDayChange(positions, quotes),
      best: bestMover(quotes),
      alerts: computeAlerts(positions, quotes),
      // Re-stamps figures when a new fix lands.
      fixToken: latestFixToken(quotes),
    };
  }, [startingCash, positions, quotes]);
}
