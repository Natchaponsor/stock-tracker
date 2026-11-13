import { describe, expect, it } from "vitest";
import { alertPairs, backPastGap, conditionMet, evaluateFxAlerts, type LatestRate } from "../fxAlerts";
import type { FxAlert, FxPair } from "../types";

const alert = (overrides: Partial<FxAlert> = {}): FxAlert => ({
  id: "a1",
  pair: "USD/THB",
  condition: { kind: "below", level: 33.5 },
  repeat: "once",
  state: "armed",
  firedAt: null,
  firedRate: null,
  seen: true,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
  ...overrides,
});

const at = (rate: number, pair: FxPair = "USD/THB") => new Map<FxPair, LatestRate>([[pair, { rate, date: "2026-11-12" }]]);

describe("conditions", () => {
  it("meets above/below at or past the level", () => {
    expect(conditionMet({ kind: "below", level: 33.5 }, 33.5)).toBe(true);
    expect(conditionMet({ kind: "below", level: 33.5 }, 33.51)).toBe(false);
    expect(conditionMet({ kind: "above", level: 35 }, 35.2)).toBe(true);
  });

  it("needs a 0.5% move back before re-arming", () => {
    expect(backPastGap({ kind: "below", level: 33.5 }, 33.6)).toBe(false);
    expect(backPastGap({ kind: "below", level: 33.5 }, 33.7)).toBe(true);
    expect(backPastGap({ kind: "above", level: 35 }, 34.9)).toBe(false);
    expect(backPastGap({ kind: "above", level: 35 }, 34.8)).toBe(true);
  });
});

describe("evaluateFxAlerts", () => {
  it("fires an armed alert whose level is reached", () => {
    expect(evaluateFxAlerts([alert()], at(33.46))).toEqual([
      { id: "a1", pair: "USD/THB", to: "fired", rate: 33.46, date: "2026-11-12" },
    ]);
    expect(evaluateFxAlerts([alert()], at(33.6))).toEqual([]);
  });

  it("leaves paused alerts and pairs without a rate alone", () => {
    expect(evaluateFxAlerts([alert({ state: "paused" })], at(33))).toEqual([]);
    expect(evaluateFxAlerts([alert()], at(33, "EUR/THB"))).toEqual([]);
  });

  it("never fires a fired alert again; re-arms a rearm alert once the rate moves back", () => {
    const fired = alert({ state: "fired", repeat: "rearm", firedAt: "2026-11-10", firedRate: 33.4 });
    expect(evaluateFxAlerts([fired], at(33.4))).toEqual([]);
    expect(evaluateFxAlerts([fired], at(33.7)).map((t) => t.to)).toEqual(["armed"]);
    expect(evaluateFxAlerts([{ ...fired, repeat: "once" }], at(33.7))).toEqual([]);
  });

  it("lists the pairs that need a rate, skipping paused alerts", () => {
    expect(alertPairs([alert(), alert({ id: "a2" }), alert({ id: "a3", pair: "EUR/THB", state: "paused" })])).toEqual([
      "USD/THB",
    ]);
  });
});
