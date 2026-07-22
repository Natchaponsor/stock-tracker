import type { Position, Strategy, WatchlistItem } from "./types";

function daysAgo(now: Date, days: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const STRATEGY_GOLDEN_CROSS_SWING = "strat-golden-cross-swing";
export const STRATEGY_TREND_CONTINUATION = "strat-trend-continuation";

export function generateSeedStrategies(now: Date = new Date()): Strategy[] {
  const createdAt = daysAgo(now, 90);
  return [
    {
      id: STRATEGY_GOLDEN_CROSS_SWING,
      name: "Golden Cross Swing",
      entryRule: "50/200 EMA golden cross, with price reclaiming the 200-day after a pullback.",
      exitRule: "Death cross, or a 2-day close below the 200-EMA.",
      createdAt,
    },
    {
      id: STRATEGY_TREND_CONTINUATION,
      name: "Trend Continuation",
      entryRule: "Add to a position already trending above the 200-EMA on a pullback to the 50-EMA.",
      exitRule: "Trail a stop below the most recent swing low; exit in full on a death cross.",
      createdAt,
    },
  ];
}

export function generateSeedPositions(now: Date = new Date()): Position[] {
  const aaplEntryDate = daysAgo(now, 27);
  const aaplNoteDate = daysAgo(now, 11);

  const nvdaEntryDate = daysAgo(now, 42);

  const pltrEntryDate = daysAgo(now, 45);
  const pltrExitDate = daysAgo(now, 27);

  const positions: Position[] = [
    {
      id: "seed-aapl-1",
      symbol: "AAPL",
      status: "open",
      strategyId: STRATEGY_GOLDEN_CROSS_SWING,
      thesis:
        "Entered on confirmed 50/200 EMA golden cross with price reclaiming the 200-day after a 5-week pullback. Plan: hold through the trend unless the EMAs cross back down or price closes two days below the 200-EMA.",
      stop: null,
      target: null,
      entries: [{ id: "f-aapl-e1", date: aaplEntryDate, price: 187.76, qty: 12 }],
      exits: [],
      notes: [
        {
          id: "n-aapl-1",
          date: aaplEntryDate,
          text: "Entered on golden cross confirmation. RSI healthy, volume above average on the breakout day.",
          priceAtNote: 187.76,
        },
        {
          id: "n-aapl-2",
          date: aaplNoteDate,
          text: "Earnings beat estimates. Holding — thesis intact, no change to plan.",
          priceAtNote: 193.4,
        },
      ],
      isSeed: true,
      createdAt: aaplEntryDate,
      updatedAt: aaplNoteDate,
    },
    {
      id: "seed-nvda-1",
      symbol: "NVDA",
      status: "open",
      strategyId: STRATEGY_TREND_CONTINUATION,
      thesis:
        "Adding to an existing uptrend on a pullback to the 50-EMA, with volume drying up on the dip and no damage to the higher-timeframe structure.",
      stop: null,
      target: null,
      entries: [{ id: "f-nvda-e1", date: nvdaEntryDate, price: 131.2, qty: 8 }],
      exits: [],
      notes: [
        {
          id: "n-nvda-1",
          date: nvdaEntryDate,
          text: "Pulled back to the rising 50-EMA on light volume and held. Added here per the plan.",
          priceAtNote: 131.2,
        },
      ],
      isSeed: true,
      createdAt: nvdaEntryDate,
      updatedAt: nvdaEntryDate,
    },
    {
      id: "seed-pltr-1",
      symbol: "PLTR",
      status: "closed",
      strategyId: STRATEGY_GOLDEN_CROSS_SWING,
      thesis: "Golden cross entry, same rule set as the AAPL position.",
      stop: null,
      target: null,
      entries: [{ id: "f-pltr-e1", date: pltrEntryDate, price: 28.4, qty: 12 }],
      exits: [{ id: "f-pltr-x1", date: pltrExitDate, price: 24.02, qty: 12 }],
      notes: [
        {
          id: "n-pltr-1",
          date: pltrEntryDate,
          text: "Entered on golden cross, same setup as AAPL.",
          priceAtNote: 28.4,
        },
        {
          id: "n-pltr-2",
          date: pltrExitDate,
          text: "Death cross confirmed. Exited in full per plan — no discretion.",
          priceAtNote: 24.02,
        },
      ],
      isSeed: true,
      createdAt: pltrEntryDate,
      updatedAt: pltrExitDate,
    },
  ];

  return positions;
}

export function generateSeedWatchlist(now: Date = new Date()): WatchlistItem[] {
  return [
    { symbol: "AAPL", addedAt: daysAgo(now, 60) },
    { symbol: "NVDA", addedAt: daysAgo(now, 60) },
    { symbol: "PLTR", addedAt: daysAgo(now, 60) },
    { symbol: "COST", addedAt: daysAgo(now, 22), note: "Watching for a first pullback to the 50-EMA." },
  ];
}
