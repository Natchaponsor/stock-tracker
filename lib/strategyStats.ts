import { computePositionMetrics } from "./positionMetrics";
import type { Position } from "./types";

export interface StrategyStats {
  totalCount: number;
  closedCount: number;
  winRate: number | null;
  avgReturnPct: number | null;
}

export function computeStrategyStats(strategyId: string, positions: Position[]): StrategyStats {
  const forStrategy = positions.filter((p) => p.strategyId === strategyId);
  const closed = forStrategy.filter((p) => p.status === "closed");

  if (closed.length === 0) {
    return { totalCount: forStrategy.length, closedCount: 0, winRate: null, avgReturnPct: null };
  }

  const closedMetrics = closed.map((p) => computePositionMetrics(p, null));
  const wins = closedMetrics.filter((m) => (m.totalPnl ?? 0) > 0).length;
  const avgReturnPct =
    closedMetrics.reduce((a, m) => a + (m.returnPct ?? 0), 0) / closedMetrics.length;

  return {
    totalCount: forStrategy.length,
    closedCount: closed.length,
    winRate: wins / closed.length,
    avgReturnPct,
  };
}
