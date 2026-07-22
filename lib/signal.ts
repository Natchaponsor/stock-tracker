import { describeCross } from "./indicators";
import type { TrendState } from "./indicators";

export type SignalTone = "good" | "bad" | "neutral";

export interface SignalRead {
  label: string;
  tone: SignalTone;
}

export function readSignal(trend: TrendState, hasEnoughData: boolean): SignalRead {
  if (!hasEnoughData) {
    return { label: "Gathering history…", tone: "neutral" };
  }

  if (trend.latestCross?.type === "golden-cross" && trend.fastAboveSlow) {
    return { label: `50/200 EMA — ${describeCross("golden-cross")}`, tone: "good" };
  }
  if (trend.latestCross?.type === "death-cross" && !trend.fastAboveSlow) {
    return { label: `50/200 EMA — ${describeCross("death-cross")}`, tone: "bad" };
  }
  if (trend.priceAboveSlow) {
    return { label: "Price holding above 200 EMA", tone: "good" };
  }
  return { label: "No signal — chopping between EMAs", tone: "neutral" };
}
