import { describe, expect, it } from "vitest";
import { bookFromExport, buildSignalFile } from "../disclosureSignals";
import type { DisclosureDataset, DisclosureTransaction } from "../disclosures";

function tx(overrides: Partial<DisclosureTransaction>): DisclosureTransaction {
  return {
    id: "t",
    filerId: "trump-dj",
    date: "2026-06-01",
    datePrecision: "day",
    type: "buy",
    asset: "Asset",
    symbol: "AAA",
    assetClass: "equity",
    amountMin: 1_000_001,
    amountMax: 5_000_000,
    context: null,
    source: { label: "Press", url: "https://www.cnbc.com/x" },
    ...overrides,
  };
}

function dataset(transactions: DisclosureTransaction[], overrides: Partial<DisclosureDataset> = {}): DisclosureDataset {
  return {
    schemaVersion: 1,
    updatedAt: "2026-10-10",
    coverage: "notable-trades-only",
    coverageNote: "test",
    filers: [{ id: "trump-dj", name: "T", role: "President", note: null }],
    filings: [],
    transactions,
    holdings: [],
    ...overrides,
  };
}

const opts = { today: "2026-10-11", generatedAt: "2026-10-11T00:00:00.000Z" };

describe("buildSignalFile", () => {
  it("sums bands per side and calls direction by count", () => {
    const file = buildSignalFile(
      dataset([
        tx({ id: "a", date: "2026-08-01", type: "buy" }),
        tx({ id: "b", date: "2026-06-18", type: "sell", amountMin: 15_001, amountMax: 50_000 }),
        tx({ id: "c", date: "2026-03-01", type: "buy", amountMin: null, amountMax: null }),
      ]),
      opts
    );
    const [p] = file.packets;
    expect(p.activity.buys).toEqual({ count: 2, bandMin: 1_000_000, bandMax: 5_000_000, unpriced: 1 });
    expect(p.activity.sells).toEqual({ count: 1, bandMin: 15_000, bandMax: 50_000, unpriced: 0 });
    expect(p.activity.netDirection).toBe("mixed");
    expect(p.activity.latest?.id).toBe("a");
    expect(p.freshness.latestTradeAgeDays).toBe(71);
  });

  it("drops trades outside the window", () => {
    const file = buildSignalFile(dataset([tx({ id: "old", date: "2025-01-01" })]), opts);
    expect(file.packets).toHaveLength(0);
    expect(file.window).toEqual({ from: "2025-10-11", to: "2026-10-11" });
  });

  it("skips trades with no symbol", () => {
    const file = buildSignalFile(dataset([tx({ symbol: null })]), opts);
    expect(file.packets).toHaveLength(0);
  });

  it("grades confidence from sourcing and banding", () => {
    const primary = { label: "OGE", url: "https://extapps2.oge.gov/x.pdf" };
    const high = buildSignalFile(dataset([tx({ source: primary })]), opts).packets[0];
    const medium = buildSignalFile(dataset([tx({})]), opts).packets[0];
    const low = buildSignalFile(dataset([tx({ amountMin: null, amountMax: null, source: primary })]), opts).packets[0];
    expect([high, medium, low].map((p) => p.dataQuality.confidence)).toEqual(["high", "medium", "low"]);
  });

  it("does not treat a look-alike host as a primary source", () => {
    const fake = { label: "x", url: "https://notoge.gov.example.com/x" };
    expect(buildSignalFile(dataset([tx({ source: fake })]), opts).packets[0].dataQuality.confidence).toBe("medium");
  });

  it("marks and ranks the user's sheet first", () => {
    const file = buildSignalFile(
      dataset([tx({ id: "1", symbol: "ZZZ", date: "2026-09-01" }), tx({ id: "2", symbol: "AAA", date: "2026-01-01" })]),
      { ...opts, book: [{ symbol: "aaa", relation: "held" }] }
    );
    expect(file.packets.map((p) => [p.symbol, p.onUserSheet])).toEqual([
      ["AAA", "held"],
      ["ZZZ", null],
    ]);
  });

  it("carries policy context and month-precision caveats", () => {
    const [p] = buildSignalFile(
      dataset([tx({ id: "x", datePrecision: "month", context: "Two days before a policy signing." })]),
      opts
    ).packets;
    expect(p.policyContext).toEqual([{ recordId: "x", text: "Two days before a policy signing." }]);
    expect(p.dataQuality.caveats.join(" ")).toMatch(/month or quarter/);
  });
});

describe("bookFromExport", () => {
  it("takes open positions as held and the watchlist as watched", () => {
    const book = bookFromExport({
      positions: [
        { symbol: "NVDA", status: "open" },
        { symbol: "OLD", status: "closed" },
      ],
      watchlist: [{ symbol: "PLTR", addedAt: "2026-01-01" }],
    });
    expect(book).toEqual([
      { symbol: "NVDA", relation: "held" },
      { symbol: "PLTR", relation: "watched" },
    ]);
  });

  it("rejects something that is not an export", () => {
    expect(() => bookFromExport({ foo: 1 })).toThrow(/Stock Tracker export/);
  });
});
