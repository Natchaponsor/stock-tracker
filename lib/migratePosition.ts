import type { Position } from "./types";

/**
 * Normalizes a persisted or imported position into the current shape. Positions saved
 * before "Strategy Notes" went multi-select carried a single `strategyId: string | null`
 * instead of `strategyIds`/`customTags` — this folds that old shape in so existing
 * localStorage data and old export files still load without losing their strategy tag.
 */
export function migratePositionShape(raw: Record<string, unknown>): Position {
  const legacyStrategyId = raw.strategyId as string | null | undefined;
  const strategyIds = Array.isArray(raw.strategyIds)
    ? (raw.strategyIds as string[])
    : legacyStrategyId
      ? [legacyStrategyId]
      : [];
  const customTags = Array.isArray(raw.customTags) ? (raw.customTags as string[]) : [];

  const { strategyId: _strategyId, ...rest } = raw;
  void _strategyId;

  return { ...rest, strategyIds, customTags } as Position;
}
