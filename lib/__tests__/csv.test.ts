import { describe, expect, it } from "vitest";
import { buildLedgerCsv, toCsv } from "../csv";
import type { Position, Strategy } from "../types";

// Local-time dates, so the yyyy-MM-dd column holds in any timezone.
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString();

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
    entries: [{ id: "e1", date: day(2026, 1, 5), price: 100, qty: 10 }],
    exits: [],
    notes: [],
    isSeed: false,
    createdAt: day(2026, 1, 5),
    updatedAt: day(2026, 1, 5),
    ...overrides,
  };
}

const strategy: Strategy = {
  id: "s1",
  name: "Breakout",
  entryRule: "",
  exitRule: "",
  createdAt: day(2026, 1, 1),
  updatedAt: day(2026, 1, 1),
};

describe("toCsv", () => {
  it("quotes fields with commas, quotes or line breaks", () => {
    expect(toCsv([["a,b", 'say "hi"', "two\nlines", 3]])).toBe('"a,b","say ""hi""","two\nlines",3\r\n');
  });

  it("defuses text a spreadsheet would run as a formula", () => {
    expect(toCsv([["=SUM(A1)", "+1", "@me", "-x"]])).toBe("'=SUM(A1),'+1,'@me,'-x\r\n");
  });

  it("keeps negative numbers as numbers and leaves blanks empty", () => {
    expect(toCsv([[-52.56, null, Number.NaN]])).toBe("-52.56,,\r\n");
  });
});

describe("buildLedgerCsv", () => {
  it("writes one row per buy and sell, newest first, with realized P&L on sells only", () => {
    const position = makePosition({
      strategyIds: ["s1"],
      customTags: ["earnings, gap"],
      exits: [{ id: "x1", date: day(2026, 2, 10), price: 120, qty: 4 }],
    });
    const lines = buildLedgerCsv([position], [strategy]).trimEnd().split("\r\n");

    expect(lines[0]).toBe(
      "Date,Symbol,Side,Shares,Price (USD),Amount (USD),Realized P&L (USD),Strategy Notes,Position"
    );
    expect(lines[1]).toBe('2026-02-10,AAPL,Sell,4,120,480,80,"Breakout; earnings, gap",Open');
    expect(lines[2]).toBe('2026-01-05,AAPL,Buy,10,100,1000,,"Breakout; earnings, gap",Open');
  });

  it("is just the header for an empty book", () => {
    expect(buildLedgerCsv([], []).trimEnd().split("\r\n")).toHaveLength(1);
  });
});

describe("cash deposits in the CSV", () => {
  it("adds a deposit row in dollars, with the original currency in the notes, in date order", () => {
    const csv = buildLedgerCsv([makePosition()], [], [
      {
        id: "c1",
        date: day(2026, 1, 3),
        currency: "THB",
        amount: 33500,
        rate: 33.5,
        rateSource: "entered",
        rateDate: null,
        note: "Top-up",
        createdAt: day(2026, 1, 3),
        updatedAt: day(2026, 1, 3),
      },
    ]);
    const lines = csv.trim().split("\r\n");
    expect(lines[1].startsWith("2026-01-05,AAPL,Buy")).toBe(true);
    expect(lines[2]).toBe("2026-01-03,,Cash deposit,,,1000,,33500 THB at 33.500 THB/USD; Top-up,");
  });
});
