import { describe, expect, it } from "vitest";
import { readMacdSignal, readPeSignal, readRsiSignal, readVolumeSignal } from "../signal";

describe("readRsiSignal", () => {
  it("reads Coming Soon when there's no data yet", () => {
    expect(readRsiSignal(null).label).toContain("Coming Soon");
    expect(readRsiSignal(NaN).tone).toBe("neutral");
  });

  it("flags overbought at 70+", () => {
    const signal = readRsiSignal(75);
    expect(signal.tone).toBe("bad");
    expect(signal.label).toContain("Overbought");
  });

  it("flags oversold at 30 or below", () => {
    const signal = readRsiSignal(22);
    expect(signal.tone).toBe("good");
    expect(signal.label).toContain("Oversold");
  });

  it("is neutral in the middle of the range", () => {
    expect(readRsiSignal(50).tone).toBe("neutral");
  });
});

describe("readMacdSignal", () => {
  it("reads Coming Soon with no data", () => {
    expect(readMacdSignal(null).label).toContain("Coming Soon");
    expect(readMacdSignal([1]).label).toContain("Coming Soon");
  });

  it("detects a bullish crossover", () => {
    const signal = readMacdSignal([-0.5, -0.2, 0.3]);
    expect(signal.tone).toBe("good");
    expect(signal.label).toContain("Bullish");
  });

  it("detects a bearish crossover", () => {
    const signal = readMacdSignal([0.5, 0.2, -0.3]);
    expect(signal.tone).toBe("bad");
    expect(signal.label).toContain("Bearish");
  });

  it("reads the current side when there's no crossover", () => {
    expect(readMacdSignal([0.4, 0.5]).tone).toBe("good");
    expect(readMacdSignal([-0.4, -0.5]).tone).toBe("bad");
  });
});

describe("readVolumeSignal", () => {
  it("reads Coming Soon with no data", () => {
    expect(readVolumeSignal(null, null).label).toContain("Coming Soon");
    expect(readVolumeSignal(1000, 0).label).toContain("Coming Soon");
  });

  it("flags a volume spike", () => {
    const signal = readVolumeSignal(2000, 1000);
    expect(signal.tone).toBe("good");
    expect(signal.label).toContain("spike");
  });

  it("flags unusually quiet volume", () => {
    const signal = readVolumeSignal(300, 1000);
    expect(signal.label).toContain("quiet");
  });

  it("is neutral near the average", () => {
    expect(readVolumeSignal(1000, 1000).tone).toBe("neutral");
  });
});

describe("readPeSignal", () => {
  it("reads Coming Soon with no data", () => {
    expect(readPeSignal(null).label).toContain("Coming Soon");
  });

  it("surfaces the ratio without a good/bad verdict", () => {
    const signal = readPeSignal(24.567);
    expect(signal.tone).toBe("neutral");
    expect(signal.label).toContain("24.6");
  });
});
