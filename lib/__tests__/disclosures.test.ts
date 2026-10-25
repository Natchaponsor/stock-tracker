import { describe, expect, it } from "vitest";
import rawDataset from "@/data/disclosures.json";
import {
  filterTransactions,
  findBookOverlap,
  formatAmountRange,
  formatCompactUsd,
  formatDisclosureDate,
  parseDisclosureDataset,
  sumRanges,
  type DisclosureTransaction,
} from "../disclosures";
import { disclosureDataset } from "../disclosureData";

function tx(overrides: Partial<DisclosureTransaction>): DisclosureTransaction {
  return {
    id: "t",
    filerId: "f",
    date: "2026-01-01",
    datePrecision: "day",
    type: "buy",
    asset: "Asset",
    symbol: "AAA",
    assetClass: "equity",
    amountMin: 1001,
    amountMax: 15000,
    context: null,
    source: { label: "Src", url: "https://example.com" },
    ...overrides,
  };
}

function cloneRaw(): Record<string, unknown> & { transactions: Record<string, unknown>[] } {
  return JSON.parse(JSON.stringify(rawDataset));
}

describe("parseDisclosureDataset", () => {
  it("accepts the shipped dataset", () => {
    expect(disclosureDataset.transactions.length).toBeGreaterThan(0);
    expect(disclosureDataset.filers.some((f) => f.id === "trump-dj")).toBe(true);
  });

  it("rejects an unknown transaction type", () => {
    const raw = cloneRaw();
    raw.transactions[0].type = "gift";
    expect(() => parseDisclosureDataset(raw)).toThrow(/transactions\[0\]\.type/);
  });

  it("rejects a filer id that is not declared", () => {
    const raw = cloneRaw();
    raw.transactions[0].filerId = "nobody";
    expect(() => parseDisclosureDataset(raw)).toThrow(/known filer id/);
  });

  it("rejects an inverted amount band", () => {
    const raw = cloneRaw();
    raw.transactions[0].amountMin = 5_000_000;
    raw.transactions[0].amountMax = 1_000;
    expect(() => parseDisclosureDataset(raw)).toThrow(/amountMin <= amountMax/);
  });

  it("rejects duplicate record ids", () => {
    const raw = cloneRaw();
    raw.transactions[1].id = raw.transactions[0].id;
    expect(() => parseDisclosureDataset(raw)).toThrow(/duplicate/);
  });

  it("rejects a non-https source", () => {
    const raw = cloneRaw();
    raw.transactions[0].source = { label: "x", url: "javascript:alert(1)" };
    expect(() => parseDisclosureDataset(raw)).toThrow(/https URL/);
  });
});

describe("formatting", () => {
  it("compacts dollar amounts", () => {
    expect(formatCompactUsd(1_860_000_000)).toBe("$1.9B");
    expect(formatCompactUsd(25_000_000)).toBe("$25M");
    expect(formatCompactUsd(78_100_000)).toBe("$78.1M");
    expect(formatCompactUsd(15_000)).toBe("$15K");
  });

  it("rounds OGE band floors back to the band edge", () => {
    expect(formatAmountRange(1_000_001, 5_000_000)).toBe("$1M–$5M");
    expect(formatAmountRange(15_001, 50_000)).toBe("$15K–$50K");
  });

  it("states what the source left out", () => {
    expect(formatAmountRange(null, null)).toBe("Not reported");
    expect(formatAmountRange(null, 730_000)).toBe("Up to $730K");
    expect(formatAmountRange(159_000, null)).toBe("$159K+");
  });

  it("formats dates at their reported precision", () => {
    expect(formatDisclosureDate("2026-01-06", "day")).toBe("Jan 6, 2026");
    expect(formatDisclosureDate("2026-08-01", "month")).toBe("Aug 2026");
    expect(formatDisclosureDate("2026-04-01", "quarter")).toBe("Q2 2026");
  });
});

describe("filterTransactions", () => {
  const rows = [
    tx({ id: "a", date: "2026-01-01", type: "buy" }),
    tx({ id: "b", date: "2026-03-01", type: "sell" }),
    tx({ id: "c", date: "2026-03-01", type: "buy", filerId: "g" }),
  ];

  it("sorts newest first and keeps dataset order on ties", () => {
    expect(filterTransactions(rows).map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("filters by type and filer together", () => {
    expect(filterTransactions(rows, { type: "buy", filerId: "f" }).map((t) => t.id)).toEqual(["a"]);
  });
});

describe("sumRanges", () => {
  it("sums only fully banded entries and counts the rest", () => {
    const total = sumRanges([
      { amountMin: 1_000_001, amountMax: 5_000_000 },
      { amountMin: 15_001, amountMax: 50_000 },
      { amountMin: null, amountMax: 730_000 },
      { amountMin: null, amountMax: null },
    ]);
    expect(total).toEqual({ min: 1_015_000, max: 5_050_000, unpriced: 2 });
  });
});

describe("findBookOverlap", () => {
  const dataset = {
    transactions: [
      tx({ id: "1", symbol: "NVDA", type: "buy", date: "2026-01-06" }),
      tx({ id: "2", symbol: "NVDA", type: "sell", date: "2026-08-01" }),
      tx({ id: "3", symbol: "BRK.B", type: "buy" }),
    ],
    holdings: [],
  };

  it("matches held and watched symbols, held first", () => {
    const overlap = findBookOverlap(dataset, [
      { symbol: "brk/b", relation: "watched" },
      { symbol: "NVDA", relation: "held" },
      { symbol: "TSLA", relation: "held" },
    ]);
    expect(overlap.map((o) => [o.symbol, o.relation])).toEqual([
      ["NVDA", "held"],
      ["BRK.B", "watched"],
    ]);
    expect(overlap[0].latest?.id).toBe("2");
    expect(overlap[0].buys).toHaveLength(1);
    expect(overlap[0].sells).toHaveLength(1);
  });

  it("prefers held when a symbol is both held and watched", () => {
    const overlap = findBookOverlap(dataset, [
      { symbol: "NVDA", relation: "watched" },
      { symbol: "NVDA", relation: "held" },
    ]);
    expect(overlap[0].relation).toBe("held");
  });
});
