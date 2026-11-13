import type { FxAlert, FxAlertCondition, FxPair } from "./types";

/**
 * FX rate alerts. The same rules run on the device (when the app opens) and on
 * the server (the daily push check), so a push and the in-app call-out always agree.
 */

/** A "rearm" alert arms again once the rate is back past its level by this much (0.5%). */
export const FX_REARM_GAP = 0.005;

/** At most this many alerts per pair, and in all; keeps the push record small. */
export const MAX_FX_ALERTS = 40;

export interface LatestRate {
  rate: number;
  /** Date of the fix (YYYY-MM-DD). */
  date: string;
}

export function conditionMet(condition: FxAlertCondition, rate: number): boolean {
  return condition.kind === "above" ? rate >= condition.level : rate <= condition.level;
}

/** True once the rate has gone back across the level by FX_REARM_GAP. */
export function backPastGap(condition: FxAlertCondition, rate: number): boolean {
  return condition.kind === "above"
    ? rate <= condition.level * (1 - FX_REARM_GAP)
    : rate >= condition.level * (1 + FX_REARM_GAP);
}

export interface FxAlertTransition {
  id: string;
  pair: FxPair;
  to: "fired" | "armed";
  rate: number;
  date: string;
}

/**
 * What should change, given the latest rate for each pair:
 * - an armed alert whose condition is met fires;
 * - a fired "rearm" alert arms again once the rate is back past the gap.
 * Paused alerts and pairs without a rate are left alone.
 */
export function evaluateFxAlerts(alerts: FxAlert[], latest: Map<FxPair, LatestRate>): FxAlertTransition[] {
  const out: FxAlertTransition[] = [];
  for (const alert of alerts) {
    const now = latest.get(alert.pair);
    if (!now) continue;
    if (alert.state === "armed" && conditionMet(alert.condition, now.rate)) {
      out.push({ id: alert.id, pair: alert.pair, to: "fired", rate: now.rate, date: now.date });
    } else if (alert.state === "fired" && alert.repeat === "rearm" && backPastGap(alert.condition, now.rate)) {
      out.push({ id: alert.id, pair: alert.pair, to: "armed", rate: now.rate, date: now.date });
    }
  }
  return out;
}

/** "below 33.50" / "above 35.00". */
export function describeCondition(condition: FxAlertCondition, format: (n: number) => string): string {
  return `${condition.kind} ${format(condition.level)}`;
}

/** Pairs that alerts are set on, for one rates request. */
export function alertPairs(alerts: Pick<FxAlert, "pair" | "state">[]): FxPair[] {
  return Array.from(new Set(alerts.filter((a) => a.state !== "paused").map((a) => a.pair)));
}
