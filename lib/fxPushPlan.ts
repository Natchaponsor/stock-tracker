import { formatRate } from "./fx";
import { backPastGap, conditionMet, type LatestRate } from "./fxAlerts";
import type { FxAlert, FxPair } from "./types";

/**
 * What the push server keeps per alert: just enough to check it. No notes,
 * no amounts, nothing from the book.
 */
export type FxPushAlert = Pick<FxAlert, "id" | "pair" | "condition" | "repeat" | "state">;

export function toPushAlert(alert: FxAlert): FxPushAlert {
  return { id: alert.id, pair: alert.pair, condition: alert.condition, repeat: alert.repeat, state: alert.state };
}

/**
 * Pushes are remembered per alert *and level*, so changing the level (or
 * re-arming by hand, which uploads the alert as armed) allows a new push.
 */
export function sentKey(alert: FxPushAlert): string {
  return `${alert.id}:${alert.condition.kind}:${alert.condition.level}`;
}

export interface PushNotice {
  alertId: string;
  pair: FxPair;
  title: string;
  body: string;
}

export interface PushPlan {
  notices: PushNotice[];
  /** The record's new `sent` map. */
  sent: Record<string, string>;
}

/**
 * The daily check for one device. The server can't change the (encrypted) book,
 * so it tracks what it already pushed in `sent`:
 * - an armed alert whose level is reached is pushed once (per level);
 * - a "rearm" alert can push again once the rate has gone back past the gap;
 * - alerts the device reports as fired or paused are never pushed.
 */
export function planPushes(
  alerts: FxPushAlert[],
  sent: Record<string, string>,
  latest: Map<FxPair, LatestRate>
): PushPlan {
  const nextSent: Record<string, string> = {};
  const notices: PushNotice[] = [];
  for (const alert of alerts) {
    const key = sentKey(alert);
    const now = latest.get(alert.pair);
    const sentAt = sent[key];
    if (!now) {
      if (sentAt) nextSent[key] = sentAt;
      continue;
    }
    if (sentAt) {
      // Already pushed: forget it once a rearm alert has moved back past the gap.
      if (!(alert.repeat === "rearm" && backPastGap(alert.condition, now.rate))) nextSent[key] = sentAt;
      continue;
    }
    if (alert.state === "armed" && conditionMet(alert.condition, now.rate)) {
      nextSent[key] = now.date;
      notices.push({
        alertId: alert.id,
        pair: alert.pair,
        title: `${alert.pair} ${alert.condition.kind === "above" ? "rose above" : "fell below"} ${formatRate(alert.condition.level)}`,
        body: `Reference rate ${formatRate(now.rate)} on ${now.date}.`,
      });
    }
  }
  return { notices, sent: nextSent };
}
