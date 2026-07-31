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

export function readRsiSignal(latestRsi: number | null): SignalRead {
  if (latestRsi === null || Number.isNaN(latestRsi)) {
    return { label: "RSI (14) — Coming Soon!", tone: "neutral" };
  }
  if (latestRsi >= 70) {
    return { label: `RSI (14) — ${latestRsi.toFixed(0)} · Overbought`, tone: "bad" };
  }
  if (latestRsi <= 30) {
    return { label: `RSI (14) — ${latestRsi.toFixed(0)} · Oversold`, tone: "good" };
  }
  return { label: `RSI (14) — ${latestRsi.toFixed(0)}`, tone: "neutral" };
}

/** Reads the MACD histogram (macd line minus signal line) for a crossover or its current side. */
export function readMacdSignal(histogram: number[] | null): SignalRead {
  if (!histogram || histogram.length < 2) {
    return { label: "MACD (12/26) — Coming Soon!", tone: "neutral" };
  }
  const last = histogram[histogram.length - 1];
  const prev = histogram[histogram.length - 2];
  if (Number.isNaN(last) || Number.isNaN(prev)) {
    return { label: "MACD (12/26) — Coming Soon!", tone: "neutral" };
  }
  if (prev <= 0 && last > 0) {
    return { label: "MACD (12/26) — Bullish crossover", tone: "good" };
  }
  if (prev >= 0 && last < 0) {
    return { label: "MACD (12/26) — Bearish crossover", tone: "bad" };
  }
  return last > 0
    ? { label: "MACD (12/26) — Above signal line", tone: "good" }
    : { label: "MACD (12/26) — Below signal line", tone: "bad" };
}

export function readVolumeSignal(latestVolume: number | null, avgVolume: number | null): SignalRead {
  if (latestVolume === null || avgVolume === null || avgVolume === 0) {
    return { label: "Volume — Coming Soon!", tone: "neutral" };
  }
  const ratio = latestVolume / avgVolume;
  if (ratio >= 1.5) {
    return { label: `Volume — ${ratio.toFixed(1)}× avg (spike)`, tone: "good" };
  }
  if (ratio <= 0.5) {
    return { label: `Volume — ${ratio.toFixed(1)}× avg (quiet)`, tone: "neutral" };
  }
  return { label: `Volume — ${ratio.toFixed(1)}× avg`, tone: "neutral" };
}

/** No good/bad verdict here — a "high" P/E means something different for a growth
 * stock than a value stock, so this just surfaces the number rather than judging it. */
export function readPeSignal(peRatio: number | null): SignalRead {
  if (peRatio === null) {
    return { label: "P/E Ratio — Coming Soon!", tone: "neutral" };
  }
  return { label: `P/E Ratio — ${peRatio.toFixed(1)}`, tone: "neutral" };
}
