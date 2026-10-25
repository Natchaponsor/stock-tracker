import {
  filterTransactions,
  normalizeSymbol,
  sumRanges,
  type BookRelation,
  type DatasetCoverage,
  type DatePrecision,
  type DisclosureDataset,
  type DisclosureHolding,
  type DisclosureTransaction,
  type TransactionType,
} from "./disclosures.ts";

/**
 * Disclosure Signal Packets: the hand-off from the disclosure-collector agent
 * to the decision agent, written to `data/disclosure-signals.json`.
 *
 * Packets are derived from the validated dataset by code, never assembled by
 * the agent from raw search results, so the arithmetic (band totals, ages,
 * direction) is the same every run and covered by tests.
 *
 * Kept free of `@/` and JSON imports so `scripts/build-disclosure-signals.ts`
 * can run it under Node's type stripping.
 */

export const SIGNAL_PACKET_VERSION = 1;

/** OGE allows 30 days from notification and no more than 45 from the trade. */
export const TYPICAL_FILING_LAG_DAYS: [number, number] = [30, 45];

export type NetDirection = "accumulating" | "distributing" | "mixed" | "none";
export type Confidence = "low" | "medium" | "high";

export interface SideActivity {
  count: number;
  bandMin: number;
  bandMax: number;
  /** Trades with no full band reported; excluded from bandMin/bandMax. */
  unpriced: number;
}

export interface SignalPacket {
  symbol: string;
  filers: string[];
  activity: {
    buys: SideActivity;
    sells: SideActivity;
    /** By trade count within the window, not by dollars — bands are too coarse to net. */
    netDirection: NetDirection;
    latest: { id: string; type: TransactionType; date: string; datePrecision: DatePrecision } | null;
  };
  holdings: { id: string; filerId: string; asOf: string; amountMin: number | null; amountMax: number | null }[];
  freshness: {
    /** Today minus the latest trade's date. Month/quarter dates are their first day, so this can overstate. */
    latestTradeAgeDays: number | null;
    typicalFilingLagDays: [number, number];
  };
  policyContext: { recordId: string; text: string }[];
  dataQuality: {
    coverage: DatasetCoverage;
    confidence: Confidence;
    caveats: string[];
  };
  onUserSheet: BookRelation | null;
  sources: string[];
}

export interface SignalFile {
  packetVersion: typeof SIGNAL_PACKET_VERSION;
  generatedAt: string;
  datasetUpdatedAt: string;
  window: { from: string; to: string };
  /** Standing instructions for the consumer; repeated in the file so they travel with the data. */
  usage: string[];
  packets: SignalPacket[];
}

export const SIGNAL_USAGE = [
  "Evidence, not a signal to copy: trades surface 30-45+ days after they happen.",
  "Officials' portfolios are reported as third-party managed and high-turnover; a single trade carries little information.",
  "netDirection and band totals show direction and scale only. They are not a recommendation.",
  "A packet with confidence 'low' may be noted but must not be the deciding factor.",
];

const PRIMARY_HOSTS = ["oge.gov", "whitehouse.gov"];

function isPrimarySource(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return PRIMARY_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / DAY_MS);
}

function shiftDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

function side(trades: DisclosureTransaction[]): SideActivity {
  const total = sumRanges(trades);
  return { count: trades.length, bandMin: total.min, bandMax: total.max, unpriced: total.unpriced };
}

function direction(buys: number, sells: number): NetDirection {
  if (buys > 0 && sells > 0) return "mixed";
  if (buys > 0) return "accumulating";
  if (sells > 0) return "distributing";
  return "none";
}

/**
 * high: every record is from a primary filing. low: most records carry no
 * full band. Everything else — press-sourced but banded — is medium.
 */
function confidence(records: { amountMin: number | null; amountMax: number | null; source: { url: string } }[]): Confidence {
  if (records.length === 0) return "low";
  const unpriced = records.filter((r) => r.amountMin === null || r.amountMax === null).length;
  if (unpriced * 2 > records.length) return "low";
  if (records.every((r) => isPrimarySource(r.source.url))) return "high";
  return "medium";
}

export interface BuildSignalsOptions {
  /** ISO date the packets are built for. */
  today: string;
  /** Trailing window, in days. Defaults to a year. */
  windowDays?: number;
  /** The reader's book, from a Data menu export, to mark held/watched symbols. */
  book?: { symbol: string; relation: BookRelation }[];
  /** Timestamp to stamp the file with; injectable so tests are deterministic. */
  generatedAt?: string;
}

export function buildSignalFile(dataset: DisclosureDataset, options: BuildSignalsOptions): SignalFile {
  const { today, windowDays = 365, book = [], generatedAt = new Date().toISOString() } = options;
  const from = shiftDays(today, -windowDays);

  const relations = new Map<string, BookRelation>();
  for (const entry of book) {
    const symbol = normalizeSymbol(entry.symbol);
    if (symbol && relations.get(symbol) !== "held") relations.set(symbol, entry.relation);
  }

  // Newest first, inside the window, with a symbol to key on.
  const trades = filterTransactions(dataset.transactions).filter(
    (t) => t.symbol !== null && t.date >= from && t.date <= today
  );
  const holdings = dataset.holdings.filter((h) => h.symbol !== null && h.asOf >= from && h.asOf <= today);

  const symbols = new Set<string>();
  for (const r of [...trades, ...holdings]) symbols.add(normalizeSymbol(r.symbol as string));

  const packets: SignalPacket[] = [];
  for (const symbol of symbols) {
    const symbolTrades = trades.filter((t) => normalizeSymbol(t.symbol as string) === symbol);
    const symbolHoldings: DisclosureHolding[] = holdings.filter((h) => normalizeSymbol(h.symbol as string) === symbol);
    const buys = symbolTrades.filter((t) => t.type === "buy");
    const sells = symbolTrades.filter((t) => t.type === "sell");
    const latest = symbolTrades[0] ?? null;
    const records = [...symbolTrades, ...symbolHoldings];

    const caveats = ["Amounts are OGE reporting bands, not exact figures."];
    if (dataset.coverage === "notable-trades-only") {
      caveats.push("Dataset holds notable trades only; the full filings contain many more lines.");
    }
    if (symbolTrades.some((t) => t.datePrecision !== "day")) {
      caveats.push("Some trade dates are known only to the month or quarter.");
    }
    if (symbolTrades.some((t) => t.filerId === "trump-dj")) {
      caveats.push("The President's portfolio is reported as managed by third-party institutions.");
    }

    packets.push({
      symbol,
      filers: [...new Set(records.map((r) => r.filerId))].sort(),
      activity: {
        buys: side(buys),
        sells: side(sells),
        netDirection: direction(buys.length, sells.length),
        latest: latest && { id: latest.id, type: latest.type, date: latest.date, datePrecision: latest.datePrecision },
      },
      holdings: symbolHoldings.map((h) => ({
        id: h.id,
        filerId: h.filerId,
        asOf: h.asOf,
        amountMin: h.amountMin,
        amountMax: h.amountMax,
      })),
      freshness: {
        latestTradeAgeDays: latest ? daysBetween(latest.date, today) : null,
        typicalFilingLagDays: TYPICAL_FILING_LAG_DAYS,
      },
      policyContext: records.filter((r) => r.context !== null).map((r) => ({ recordId: r.id, text: r.context as string })),
      dataQuality: { coverage: dataset.coverage, confidence: confidence(records), caveats },
      onUserSheet: relations.get(symbol) ?? null,
      sources: [...new Set(records.map((r) => r.source.url))],
    });
  }

  // Held, then watched, then the rest; most recently active first within each.
  const sheetRank = (p: SignalPacket) => (p.onUserSheet === "held" ? 0 : p.onUserSheet === "watched" ? 1 : 2);
  packets.sort((a, b) => {
    if (sheetRank(a) !== sheetRank(b)) return sheetRank(a) - sheetRank(b);
    const da = a.activity.latest?.date ?? "";
    const db = b.activity.latest?.date ?? "";
    if (da !== db) return da < db ? 1 : -1;
    return a.symbol.localeCompare(b.symbol);
  });

  return {
    packetVersion: SIGNAL_PACKET_VERSION,
    generatedAt,
    datasetUpdatedAt: dataset.updatedAt,
    window: { from, to: today },
    usage: SIGNAL_USAGE,
    packets,
  };
}

/**
 * Reads held and watched symbols out of a Data menu export. Only the fields
 * it needs are checked — the full import validator lives with the store.
 */
export function bookFromExport(raw: unknown): { symbol: string; relation: BookRelation }[] {
  if (typeof raw !== "object" || raw === null) throw new Error("Book export is not a JSON object");
  const { positions, watchlist } = raw as { positions?: unknown; watchlist?: unknown };
  if (!Array.isArray(positions) || !Array.isArray(watchlist)) {
    throw new Error("Book export is missing positions or watchlist — is it a Stock Tracker export?");
  }
  const book: { symbol: string; relation: BookRelation }[] = [];
  for (const p of positions) {
    if (p && typeof p.symbol === "string" && p.status === "open") book.push({ symbol: p.symbol, relation: "held" });
  }
  for (const w of watchlist) {
    if (w && typeof w.symbol === "string") book.push({ symbol: w.symbol, relation: "watched" });
  }
  return book;
}
