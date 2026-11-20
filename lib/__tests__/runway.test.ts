import { describe, expect, it } from "vitest";
import {
  bookStart,
  buildValueSeries,
  capitalAt,
  capitalSteps,
  dayMovesFromQuotes,
  rangeStart,
  sectorMoves,
} from "../runway";
import { lastCloseBoundary, mergeBars, planFetch, secondsUntilNextClose, splitAdjustedCloses } from "../priceHistory";
import type { CashDeposit, CustomSector, DailyBar, Position, Quote } from "../types";

/** Local midnight of a day in Nov 2026, the way fills and deposits are stored. */
const D = (day: number) => new Date(2026, 10, day).toISOString();
const K = (day: number) => `2026-11-${String(day).padStart(2, "0")}`;

function position(symbol: string, entries: [number, number, number][], exits: [number, number, number][] = []): Position {
  return {
    id: `p-${symbol}`,
    symbol,
    status: exits.reduce((a, [, , q]) => a + q, 0) >= entries.reduce((a, [, , q]) => a + q, 0) ? "closed" : "open",
    strategyIds: [],
    customTags: [],
    thesis: "",
    stop: null,
    target: null,
    entries: entries.map(([day, price, qty], i) => ({ id: `e${i}`, date: D(day), price, qty })),
    exits: exits.map(([day, price, qty], i) => ({ id: `x${i}`, date: D(day), price, qty })),
    notes: [],
    isSeed: false,
    createdAt: D(1),
    updatedAt: D(1),
  };
}

function deposit(day: number, amount: number, rate = 1): CashDeposit {
  return {
    id: `d${day}`,
    date: D(day),
    currency: rate === 1 ? "USD" : "THB",
    amount,
    rate,
    rateSource: rate === 1 ? null : "entered",
    rateDate: null,
    createdAt: D(day),
    updatedAt: D(day),
  };
}

const bars = (symbol: string, closes: [number, number][]): [string, DailyBar[]] => [
  symbol,
  closes.map(([day, close]) => ({ date: K(day), close, volume: null })),
];

const quote = (symbol: string, price: number, changePct: number | null = null): [string, Quote] => [
  symbol,
  { symbol, price, changePct, asOf: null },
];

const chips: CustomSector = { id: "chips", name: "AI Chips", swatch: "cat-food", symbols: ["NVDA"], updatedAt: D(1) };

describe("capital", () => {
  it("starts with the starting cash on the book's first day and steps up on each deposit day", () => {
    const steps = capitalSteps(1000, [deposit(10, 500), deposit(10, 3300, 33), deposit(4, 200)], K(2));
    expect(steps.map((s) => [s.date, s.capital, s.added])).toEqual([
      [K(2), 1000, 1000],
      [K(4), 1200, 200],
      [K(10), 1800, 600],
    ]);
    expect(steps[2].deposits).toHaveLength(2);
    expect(capitalAt(steps, K(3))).toBe(1000);
    expect(capitalAt(steps, K(12))).toBe(1800);
    expect(capitalAt(steps, K(1))).toBe(0);
  });

  it("folds a deposit made on the first day into the starting step", () => {
    const steps = capitalSteps(1000, [deposit(2, 500)], K(2));
    expect(steps).toHaveLength(1);
    expect(steps[0].capital).toBe(1500);
  });

  it("finds the book's first day across fills and deposits", () => {
    expect(bookStart([position("AAPL", [[5, 10, 1]])], [deposit(3, 1)])).toBe(K(3));
    expect(bookStart([], [])).toBeNull();
  });
});

describe("daily value", () => {
  it("is cash plus shares held at each close, with today's point on live prices", () => {
    const series = buildValueSeries({
      positions: [position("AAPL", [[3, 100, 10]], [[5, 120, 4]])],
      startingCash: 2000,
      deposits: [deposit(4, 500)],
      bars: new Map([bars("AAPL", [[2, 95], [3, 100], [4, 110], [5, 120], [6, 115]])]),
      quotes: new Map([quote("AAPL", 130)]),
      customSectors: [],
      today: K(7),
    });
    const at = (day: number) => series.points.find((p) => p.date === K(day))!;

    // The first fill is on the 3rd, so the 2nd's bar is before the book and left out.
    expect(series.points.map((p) => p.date)).toEqual([K(3), K(4), K(5), K(6), K(7)]);
    expect(at(3).value).toBe(1000 + 10 * 100);
    expect(at(4).value).toBe(1500 + 10 * 110);
    expect(at(4).capital).toBe(2500);
    expect(at(5).value).toBe(1500 + 480 + 6 * 120);
    expect(at(7).live).toBe(true);
    expect(at(7).value).toBe(1980 + 6 * 130);
    expect(at(7).sectors).toEqual({ Technology: 6 * 130 });
  });

  it("uses the latest close for today when the quote is older than it", () => {
    const run = (asOf: string) =>
      buildValueSeries({
        positions: [position("AAPL", [[3, 100, 10]])],
        startingCash: 1000,
        deposits: [],
        bars: new Map([bars("AAPL", [[3, 100], [6, 120]])]),
        quotes: new Map([["AAPL", { symbol: "AAPL", price: 110, changePct: null, asOf }]]),
        customSectors: [],
        today: K(7),
      }).points.at(-1)!.value;
    expect(run("2026-11-05T21:00:00Z")).toBe(10 * 120);
    expect(run("2026-11-07T15:00:00Z")).toBe(10 * 110);
  });

  it("restates closes before a split in today's share terms", () => {
    const series = buildValueSeries({
      positions: [position("NVDA", [[3, 50, 20]])],
      startingCash: 1000,
      deposits: [],
      bars: new Map([
        [
          "NVDA",
          [
            { date: K(3), close: 100, volume: null },
            { date: K(4), close: 52, volume: null, splitFactor: 2 },
          ],
        ],
      ]),
      quotes: new Map(),
      customSectors: [chips],
      today: K(5),
    });
    expect(series.points[0].value).toBe(0 + 20 * 50);
    expect(series.points[1].value).toBe(20 * 52);
    expect(series.points[0].sectors).toEqual({ "custom:chips": 1000 });
    expect(series.sectors.get("custom:chips")?.name).toBe("AI Chips");
  });

  it("values a symbol with no history at its last fill price and says so", () => {
    const series = buildValueSeries({
      positions: [position("ZZZZ", [[3, 40, 5]])],
      startingCash: 500,
      deposits: [],
      bars: new Map(),
      quotes: new Map(),
      customSectors: [],
      today: K(5),
    });
    expect(series.points).toHaveLength(1);
    expect(series.points[0].value).toBe(500);
    expect(series.unpriced).toEqual(["ZZZZ"]);
  });

  it("is empty for an empty book", () => {
    const series = buildValueSeries({
      positions: [],
      startingCash: 1000,
      deposits: [],
      bars: new Map(),
      quotes: new Map(),
      customSectors: [],
      today: K(5),
    });
    expect(series.points).toEqual([]);
  });
});

describe("sector movement", () => {
  const positions = [position("NVDA", [[2, 100, 10], [5, 110, 5]]), position("AAPL", [[2, 50, 10]], [[6, 70, 10]])];
  const series = buildValueSeries({
    positions,
    startingCash: 5000,
    deposits: [],
    bars: new Map([
      bars("NVDA", [[2, 100], [3, 105], [4, 108], [5, 110], [6, 120]]),
      bars("AAPL", [[2, 50], [3, 55], [4, 60], [5, 65], [6, 70]]),
    ]),
    quotes: new Map([quote("NVDA", 120)]),
    customSectors: [chips],
    today: K(7),
  });

  it("takes buys and sells inside the range out of the change", () => {
    // A month back from Dec 4 starts on Nov 4, so the base is the 3rd's close:
    // NVDA 10 × 105 → 15 × 120 with 550 bought; AAPL 10 × 55 → sold for 700.
    const result = sectorMoves(series, "1M", "2026-12-04", positions, [chips])!;
    expect(result.from).toBe(K(3));
    const byKey = Object.fromEntries(result.moves.map((m) => [m.key, m.change]));
    expect(byKey["custom:chips"]).toBeCloseTo(1800 - 1050 - 550);
    expect(byKey.Technology).toBeCloseTo(0 - 550 + 700);
  });

  it("counts everything from the book's start when the range is longer than the book", () => {
    const result = sectorMoves(series, "All", K(7), positions, [chips])!;
    const byKey = Object.fromEntries(result.moves.map((m) => [m.key, m.change]));
    expect(byKey["custom:chips"]).toBeCloseTo(15 * 120 - 1550);
    expect(byKey.Technology).toBeCloseTo(700 - 500);
    expect(result.moves[0].key).toBe("custom:chips");
    expect(result.total).toBeCloseTo(250 + 200);
  });

  it("uses the last session's change from quotes for 1D", () => {
    const result = dayMovesFromQuotes(
      [position("NVDA", [[2, 100, 10]])],
      new Map([quote("NVDA", 110, 10)]),
      [chips],
      K(7)
    )!;
    expect(result.moves).toEqual([expect.objectContaining({ key: "custom:chips", name: "AI Chips" })]);
    expect(result.moves[0].change).toBeCloseTo(100);
    expect(dayMovesFromQuotes([], new Map(), [], K(7))).toBeNull();
  });

  it("starts ranges where expected", () => {
    expect(rangeStart("1M", "2026-03-31")).toBe("2026-02-28");
    expect(rangeStart("YTD", "2026-11-18")).toBe("2026-01-01");
    expect(rangeStart("All", "2026-11-18")).toBe("");
  });
});

describe("price history cache", () => {
  const at = (iso: string) => new Date(iso);

  it("turns over once a day, after the close is out", () => {
    expect(secondsUntilNextClose(at("2026-11-18T22:00:00Z"))).toBe(3600);
    expect(secondsUntilNextClose(at("2026-11-18T23:30:00Z"))).toBe(23.5 * 3600);
    expect(lastCloseBoundary(at("2026-11-18T10:00:00Z")).toISOString()).toBe("2026-11-17T23:00:00.000Z");
  });

  it("fetches only what a device is missing", () => {
    const cached = {
      from: "2026-01-01",
      bars: [{ date: "2026-11-16", close: 1, volume: null }],
      fetchedAt: "2026-11-17T23:30:00Z",
    };
    expect(planFetch(undefined, "2026-01-01", at("2026-11-18T10:00:00Z"))).toBe("2026-01-01");
    expect(planFetch(cached, "2026-03-01", at("2026-11-18T10:00:00Z"))).toBeNull();
    expect(planFetch(cached, "2025-06-01", at("2026-11-18T10:00:00Z"))).toBe("2025-06-01");
    expect(planFetch(cached, "2026-03-01", at("2026-11-18T23:10:00Z"))).toBe("2026-11-16");
  });

  it("merges bars by day and restates splits backwards", () => {
    const merged = mergeBars(
      [{ date: "2026-11-02", close: 1, volume: null }, { date: "2026-11-03", close: 2, volume: null }],
      [{ date: "2026-11-03", close: 3, volume: null }, { date: "2026-11-04", close: 4, volume: null }]
    );
    expect(merged.map((b) => b.close)).toEqual([1, 3, 4]);
    const adjusted = splitAdjustedCloses([
      { date: "2026-11-02", close: 400, volume: null },
      { date: "2026-11-03", close: 105, volume: null, splitFactor: 4 },
      { date: "2026-11-04", close: 50, volume: null, splitFactor: 2 },
    ]);
    expect(Object.fromEntries(adjusted)).toEqual({ "2026-11-02": 50, "2026-11-03": 52.5, "2026-11-04": 50 });
  });
});
