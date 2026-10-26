import { describe, expect, it } from "vitest";
import { buildLedger } from "../ledger";
import { computePositionMetrics } from "../positionMetrics";
import type { Position } from "../types";

function makePosition(overrides: Partial<Position> = {}): Position {
  return {
    id: "p1",
    symbol: "AAPL",
    status: "open",
    strategyIds: [],
    customTags: [],
    thesis: "",
    stop: null,
    target: null,
    entries: [{ id: "e1", date: "2026-01-01T00:00:00.000Z", price: 100, qty: 10 }],
    exits: [],
    notes: [],
    isSeed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const prices = (entries: Record<string, number | null>) => new Map(Object.entries(entries));

describe("buildLedger — buys", () => {
  it("shows a buy's unrealized P&L at the latest price when nothing has been sold", () => {
    const [row] = buildLedger([makePosition()], prices({ AAPL: 130 }));
    expect(row.kind).toBe("buy");
    expect(row.price).toBe(100);
    expect(row.qty).toBe(10);
    expect(row.pnl).toBe(300); // (130-100)*10
    expect(row.returnPct).toBeCloseTo(0.3);
    expect(row.soldOut).toBe(false);
  });

  it("is unknown, not zero, when there is no live quote yet", () => {
    const [row] = buildLedger([makePosition()], new Map());
    expect(row.pnl).toBeNull();
    expect(row.returnPct).toBeNull();
    expect(row.soldOut).toBe(false);
  });

  it("has no unrealized P&L once the position is sold out", () => {
    const sold = makePosition({
      status: "closed",
      exits: [{ id: "x1", date: "2026-02-01T00:00:00.000Z", price: 120, qty: 10 }],
    });
    const buy = buildLedger([sold], prices({ AAPL: 130 })).find((r) => r.kind === "buy")!;
    expect(buy.pnl).toBeNull();
    expect(buy.soldOut).toBe(true);
  });
});

describe("buildLedger — sells", () => {
  it("shows a sale's realized P&L against the position's average entry", () => {
    const position = makePosition({
      entries: [
        { id: "e1", date: "2026-01-01T00:00:00.000Z", price: 100, qty: 10 },
        { id: "e2", date: "2026-01-10T00:00:00.000Z", price: 120, qty: 10 },
      ],
      exits: [{ id: "x1", date: "2026-02-01T00:00:00.000Z", price: 150, qty: 5 }],
    });
    const sell = buildLedger([position], new Map()).find((r) => r.kind === "sell")!;
    expect(sell.price).toBe(150);
    expect(sell.pnl).toBe(200); // (150 - avg 110) * 5
    expect(sell.returnPct).toBeCloseTo(150 / 110 - 1);
  });

  it("needs no live quote — realized P&L is locked in", () => {
    const position = makePosition({
      status: "closed",
      exits: [{ id: "x1", date: "2026-02-01T00:00:00.000Z", price: 90, qty: 10 }],
    });
    const sell = buildLedger([position], new Map()).find((r) => r.kind === "sell")!;
    expect(sell.pnl).toBe(-100);
  });
});

describe("buildLedger — reconciles with the Profit & Loss figures", () => {
  const position = makePosition({
    entries: [
      { id: "e1", date: "2026-01-01T00:00:00.000Z", price: 100, qty: 10 },
      { id: "e2", date: "2026-01-10T00:00:00.000Z", price: 130, qty: 20 },
    ],
    exits: [
      { id: "x1", date: "2026-02-01T00:00:00.000Z", price: 150, qty: 6 },
      { id: "x2", date: "2026-02-15T00:00:00.000Z", price: 140, qty: 4 },
    ],
  });
  const metrics = computePositionMetrics(position, 160);
  const rows = buildLedger([position], prices({ AAPL: 160 }));

  it("sell rows sum to the position's realized P&L", () => {
    const realized = rows.filter((r) => r.kind === "sell").reduce((a, r) => a + (r.pnl ?? 0), 0);
    expect(realized).toBeCloseTo(metrics.realizedPnl);
  });

  it("buy rows sum to the position's unrealized P&L, even after partial sells", () => {
    const unrealized = rows.filter((r) => r.kind === "buy").reduce((a, r) => a + (r.pnl ?? 0), 0);
    expect(unrealized).toBeCloseTo(metrics.unrealizedPnl ?? NaN);
  });
});

describe("buildLedger — ordering and scope", () => {
  it("lists newest first across every position, closed ones included", () => {
    const closed = makePosition({
      id: "p2",
      symbol: "PLTR",
      status: "closed",
      entries: [{ id: "e1", date: "2026-01-05T00:00:00.000Z", price: 20, qty: 10 }],
      exits: [{ id: "x1", date: "2026-03-01T00:00:00.000Z", price: 25, qty: 10 }],
    });
    const open = makePosition({ entries: [{ id: "e9", date: "2026-02-01T00:00:00.000Z", price: 100, qty: 1 }] });
    const rows = buildLedger([open, closed], new Map());
    expect(rows.map((r) => `${r.symbol}:${r.kind}`)).toEqual(["PLTR:sell", "AAPL:buy", "PLTR:buy"]);
  });

  it("puts a same-day sale above the buy it follows", () => {
    const position = makePosition({
      entries: [{ id: "e1", date: "2026-01-01T00:00:00.000Z", price: 100, qty: 10 }],
      exits: [{ id: "x1", date: "2026-01-01T00:00:00.000Z", price: 101, qty: 2 }],
    });
    const kinds = buildLedger([position], new Map()).map((r) => r.kind);
    expect(kinds).toEqual(["sell", "buy"]);
  });

  it("keeps rows from different positions with the same fill id distinct", () => {
    const a = makePosition({ id: "a" });
    const b = makePosition({ id: "b" });
    const keys = buildLedger([a, b], new Map()).map((r) => r.key);
    expect(new Set(keys).size).toBe(2);
  });

  it("returns nothing for an empty book", () => {
    expect(buildLedger([], new Map())).toEqual([]);
  });
});
