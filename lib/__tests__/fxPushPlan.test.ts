import { describe, expect, it } from "vitest";
import { planPushes, sentKey, type FxPushAlert } from "../fxPushPlan";
import type { LatestRate } from "../fxAlerts";
import type { FxPair } from "../types";

const alert = (overrides: Partial<FxPushAlert> = {}): FxPushAlert => ({
  id: "a1",
  pair: "USD/THB",
  condition: { kind: "below", level: 33.5 },
  repeat: "once",
  state: "armed",
  ...overrides,
});

const at = (rate: number, date = "2026-11-12") => new Map<FxPair, LatestRate>([["USD/THB", { rate, date }]]);

describe("planPushes", () => {
  it("pushes an armed alert once when its level is reached", () => {
    const first = planPushes([alert()], {}, at(33.4));
    expect(first.notices).toEqual([
      { alertId: "a1", pair: "USD/THB", title: "USD/THB fell below 33.500", body: "Reference rate 33.400 on 2026-11-12." },
    ]);
    expect(first.sent).toEqual({ [sentKey(alert())]: "2026-11-12" });

    const nextDay = planPushes([alert()], first.sent, at(33.3, "2026-11-13"));
    expect(nextDay.notices).toEqual([]);
    expect(nextDay.sent).toEqual(first.sent);
  });

  it("never pushes alerts the device reports as fired or paused", () => {
    expect(planPushes([alert({ state: "fired" }), alert({ id: "a2", state: "paused" })], {}, at(33)).notices).toEqual([]);
  });

  it("lets a rearm alert push again after the rate moves back past the gap", () => {
    const rearm = alert({ repeat: "rearm" });
    const { sent } = planPushes([rearm], {}, at(33.4));
    const recovered = planPushes([rearm], sent, at(33.8, "2026-11-14"));
    expect(recovered.notices).toEqual([]);
    expect(recovered.sent).toEqual({});
    expect(planPushes([rearm], recovered.sent, at(33.45, "2026-11-15")).notices).toHaveLength(1);
  });

  it("allows a new push when the level changes, and forgets deleted alerts", () => {
    const { sent } = planPushes([alert()], {}, at(33.4));
    const moved = alert({ condition: { kind: "below", level: 33.45 } });
    expect(planPushes([moved], sent, at(33.4)).notices).toHaveLength(1);
    expect(planPushes([], sent, at(33.4)).sent).toEqual({});
  });

  it("keeps what was sent while a pair has no rate", () => {
    const sent = { [sentKey(alert())]: "2026-11-12" };
    expect(planPushes([alert()], sent, new Map()).sent).toEqual(sent);
  });
});
