/**
 * Officials' financial disclosures (OGE Form 278-T / 278e), as a curated log.
 *
 * The dataset lives in `data/disclosures.json` rather than in code so a
 * collector — a person or the disclosure-collector agent — can append to it
 * without touching the app. Everything read from it goes through
 * `parseDisclosureDataset`, so a malformed entry fails loudly instead of
 * rendering as a plausible-looking row.
 *
 * This module has no `@/` imports and no JSON import, so Node can run it
 * directly (type stripping) from `scripts/build-disclosure-signals.ts`.
 * The app loads the dataset through `lib/disclosureData.ts`.
 *
 * Amounts are the filing's reporting bands, never exact figures. A bound the
 * source did not state is `null`, and the sheet says so rather than showing 0.
 */

export const TRANSACTION_TYPES = ["buy", "sell"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const ASSET_CLASSES = [
  "equity",
  "etf",
  "corporate-bond",
  "muni-bond",
  "crypto",
  "private",
] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  equity: "Equity",
  etf: "ETF",
  "corporate-bond": "Corp. bond",
  "muni-bond": "Muni bond",
  crypto: "Crypto",
  private: "Private",
};

export const DATE_PRECISIONS = ["day", "month", "quarter"] as const;
export type DatePrecision = (typeof DATE_PRECISIONS)[number];

export interface DisclosureSource {
  label: string;
  url: string;
}

export interface Filer {
  id: string;
  name: string;
  role: string;
  note: string | null;
}

/** A whole periodic report, summarised: how much trading it covers. */
export interface FilingSummary {
  id: string;
  filerId: string;
  period: string;
  periodLabel: string;
  trades: number | null;
  /** The source said "more than N", so N is a floor, not a count. */
  tradesIsFloor: boolean;
  buys: number | null;
  sells: number | null;
  valueMin: number | null;
  valueMax: number | null;
  source: DisclosureSource;
}

export interface DisclosureTransaction {
  id: string;
  filerId: string;
  /** ISO date. With a coarser precision it is the first day of that month or quarter. */
  date: string;
  datePrecision: DatePrecision;
  type: TransactionType;
  asset: string;
  symbol: string | null;
  assetClass: AssetClass;
  amountMin: number | null;
  amountMax: number | null;
  context: string | null;
  source: DisclosureSource;
}

/** A position reported on an annual filing, rather than a dated trade. */
export interface DisclosureHolding {
  id: string;
  filerId: string;
  asOf: string;
  asset: string;
  symbol: string | null;
  assetClass: AssetClass;
  amountMin: number | null;
  amountMax: number | null;
  context: string | null;
  source: DisclosureSource;
}

export const DATASET_COVERAGES = ["notable-trades-only", "full-filing"] as const;
export type DatasetCoverage = (typeof DATASET_COVERAGES)[number];

export interface DisclosureDataset {
  schemaVersion: 1;
  updatedAt: string;
  /** Whether filings were curated from coverage or transcribed line by line. */
  coverage: DatasetCoverage;
  coverageNote: string;
  filers: Filer[];
  filings: FilingSummary[];
  transactions: DisclosureTransaction[];
  holdings: DisclosureHolding[];
}

// ---- Validation -----------------------------------------------------------

type Obj = Record<string, unknown>;

function fail(path: string, expected: string): never {
  throw new Error(`Invalid disclosure dataset at ${path}: expected ${expected}`);
}

function obj(value: unknown, path: string): Obj {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(path, "an object");
  return value as Obj;
}

function str(o: Obj, key: string, path: string): string {
  const v = o[key];
  if (typeof v !== "string" || v.length === 0) fail(`${path}.${key}`, "a non-empty string");
  return v;
}

function strOrNull(o: Obj, key: string, path: string): string | null {
  const v = o[key];
  if (v === null) return null;
  if (typeof v !== "string" || v.length === 0) fail(`${path}.${key}`, "a non-empty string or null");
  return v;
}

function numOrNull(o: Obj, key: string, path: string): number | null {
  const v = o[key];
  if (v === null) return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) fail(`${path}.${key}`, "a non-negative number or null");
  return v;
}

function oneOf<T extends string>(o: Obj, key: string, allowed: readonly T[], path: string): T {
  const v = o[key];
  if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) {
    fail(`${path}.${key}`, `one of ${allowed.join(", ")}`);
  }
  return v as T;
}

function isoDate(o: Obj, key: string, path: string): string {
  const v = str(o, key, path);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) fail(`${path}.${key}`, "an ISO date (YYYY-MM-DD)");
  return v;
}

function source(o: Obj, path: string): DisclosureSource {
  const s = obj(o.source, `${path}.source`);
  const url = str(s, "url", `${path}.source`);
  if (!/^https:\/\//.test(url)) fail(`${path}.source.url`, "an https URL");
  return { label: str(s, "label", `${path}.source`), url };
}

function amounts(o: Obj, path: string): { amountMin: number | null; amountMax: number | null } {
  const amountMin = numOrNull(o, "amountMin", path);
  const amountMax = numOrNull(o, "amountMax", path);
  if (amountMin !== null && amountMax !== null && amountMin > amountMax) fail(path, "amountMin <= amountMax");
  return { amountMin, amountMax };
}

function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, "an array");
  return value;
}

export function parseDisclosureDataset(raw: unknown): DisclosureDataset {
  const root = obj(raw, "$");
  if (root.schemaVersion !== 1) fail("$.schemaVersion", "1");

  const filers = list(root.filers, "$.filers").map((item, i): Filer => {
    const path = `$.filers[${i}]`;
    const o = obj(item, path);
    return { id: str(o, "id", path), name: str(o, "name", path), role: str(o, "role", path), note: strOrNull(o, "note", path) };
  });
  const filerIds = new Set(filers.map((f) => f.id));

  function filerId(o: Obj, path: string): string {
    const id = str(o, "filerId", path);
    if (!filerIds.has(id)) fail(`${path}.filerId`, `a known filer id (got "${id}")`);
    return id;
  }

  const filings = list(root.filings, "$.filings").map((item, i): FilingSummary => {
    const path = `$.filings[${i}]`;
    const o = obj(item, path);
    const valueMin = numOrNull(o, "valueMin", path);
    const valueMax = numOrNull(o, "valueMax", path);
    if (valueMin !== null && valueMax !== null && valueMin > valueMax) fail(path, "valueMin <= valueMax");
    if (typeof o.tradesIsFloor !== "boolean") fail(`${path}.tradesIsFloor`, "a boolean");
    return {
      id: str(o, "id", path),
      filerId: filerId(o, path),
      period: str(o, "period", path),
      periodLabel: str(o, "periodLabel", path),
      trades: numOrNull(o, "trades", path),
      tradesIsFloor: o.tradesIsFloor,
      buys: numOrNull(o, "buys", path),
      sells: numOrNull(o, "sells", path),
      valueMin,
      valueMax,
      source: source(o, path),
    };
  });

  const transactions = list(root.transactions, "$.transactions").map((item, i): DisclosureTransaction => {
    const path = `$.transactions[${i}]`;
    const o = obj(item, path);
    return {
      id: str(o, "id", path),
      filerId: filerId(o, path),
      date: isoDate(o, "date", path),
      datePrecision: oneOf(o, "datePrecision", DATE_PRECISIONS, path),
      type: oneOf(o, "type", TRANSACTION_TYPES, path),
      asset: str(o, "asset", path),
      symbol: strOrNull(o, "symbol", path),
      assetClass: oneOf(o, "assetClass", ASSET_CLASSES, path),
      ...amounts(o, path),
      context: strOrNull(o, "context", path),
      source: source(o, path),
    };
  });

  const holdings = list(root.holdings, "$.holdings").map((item, i): DisclosureHolding => {
    const path = `$.holdings[${i}]`;
    const o = obj(item, path);
    return {
      id: str(o, "id", path),
      filerId: filerId(o, path),
      asOf: isoDate(o, "asOf", path),
      asset: str(o, "asset", path),
      symbol: strOrNull(o, "symbol", path),
      assetClass: oneOf(o, "assetClass", ASSET_CLASSES, path),
      ...amounts(o, path),
      context: strOrNull(o, "context", path),
      source: source(o, path),
    };
  });

  const ids = [...filings, ...transactions, ...holdings].map((r) => r.id);
  const dupe = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dupe) fail("$", `unique record ids (duplicate "${dupe}")`);

  return {
    schemaVersion: 1,
    updatedAt: isoDate(root, "updatedAt", "$"),
    coverage: oneOf(root, "coverage", DATASET_COVERAGES, "$"),
    coverageNote: str(root, "coverageNote", "$"),
    filers,
    filings,
    transactions,
    holdings,
  };
}

// ---- Presentation helpers -------------------------------------------------

/** $1.2B / $250M / $15K — reporting bands are coarse, so the figure is too. */
export function formatCompactUsd(value: number): string {
  const units: [number, string][] = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [size, suffix] of units) {
    if (value >= size) {
      const scaled = value / size;
      const digits = scaled >= 100 || Number.isInteger(scaled) ? 0 : 1;
      return `$${Number(scaled.toFixed(digits))}${suffix}`;
    }
  }
  return `$${Math.round(value)}`;
}

/**
 * OGE bands start one dollar above the previous band's ceiling ($1,000,001),
 * which reads as noise once compacted; round those back to the band edge.
 */
function bandEdge(value: number): number {
  return value % 1000 === 1 ? value - 1 : value;
}

export function formatAmountRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Not reported";
  if (min === null) return `Up to ${formatCompactUsd(max as number)}`;
  if (max === null) return `${formatCompactUsd(bandEdge(min))}+`;
  return `${formatCompactUsd(bandEdge(min))}–${formatCompactUsd(max)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats on the date's own parts so a UTC midnight never slips a day. */
export function formatDisclosureDate(date: string, precision: DatePrecision): string {
  const [y, m, d] = date.split("-").map(Number);
  if (precision === "quarter") return `Q${Math.floor((m - 1) / 3) + 1} ${y}`;
  if (precision === "month") return `${MONTHS[m - 1]} ${y}`;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// ---- Queries --------------------------------------------------------------

export interface TransactionFilter {
  filerId?: string | null;
  type?: TransactionType | null;
  assetClass?: AssetClass | null;
}

/** Newest first. Same-date entries keep the dataset's order. */
export function filterTransactions(
  transactions: DisclosureTransaction[],
  { filerId = null, type = null, assetClass = null }: TransactionFilter = {}
): DisclosureTransaction[] {
  return transactions
    .map((t, index) => ({ t, index }))
    .filter(({ t }) => (filerId === null || t.filerId === filerId) && (type === null || t.type === type) && (assetClass === null || t.assetClass === assetClass))
    .sort((a, b) => (a.t.date === b.t.date ? a.index - b.index : a.t.date < b.t.date ? 1 : -1))
    .map(({ t }) => t);
}

export interface RangeTotal {
  min: number;
  max: number;
  /** Entries that carried no usable band and are left out of min/max. */
  unpriced: number;
}

/**
 * Sums reporting bands. An entry needs both bounds to count — a lone ceiling
 * or floor would make the total look tighter than the sources allow.
 */
export function sumRanges(items: { amountMin: number | null; amountMax: number | null }[]): RangeTotal {
  let min = 0;
  let max = 0;
  let unpriced = 0;
  for (const item of items) {
    if (item.amountMin === null || item.amountMax === null) {
      unpriced += 1;
      continue;
    }
    min += bandEdge(item.amountMin);
    max += item.amountMax;
  }
  return { min, max, unpriced };
}

export type BookRelation = "held" | "watched";

export interface BookOverlap {
  symbol: string;
  relation: BookRelation;
  buys: DisclosureTransaction[];
  sells: DisclosureTransaction[];
  holdings: DisclosureHolding[];
  /** Most recent dated trade in the symbol, if any. */
  latest: DisclosureTransaction | null;
}

export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace("/", ".");
}

/**
 * Which symbols on the reader's own sheet also appear in officials'
 * disclosures. Held beats watched when a symbol is both.
 */
export function findBookOverlap(
  dataset: Pick<DisclosureDataset, "transactions" | "holdings">,
  book: { symbol: string; relation: BookRelation }[]
): BookOverlap[] {
  const relations = new Map<string, BookRelation>();
  for (const entry of book) {
    const symbol = normalizeSymbol(entry.symbol);
    if (!symbol) continue;
    if (relations.get(symbol) !== "held") relations.set(symbol, entry.relation);
  }

  const overlaps: BookOverlap[] = [];
  for (const [symbol, relation] of relations) {
    const trades = filterTransactions(dataset.transactions).filter((t) => t.symbol !== null && normalizeSymbol(t.symbol) === symbol);
    const holdings = dataset.holdings.filter((h) => h.symbol !== null && normalizeSymbol(h.symbol) === symbol);
    if (trades.length === 0 && holdings.length === 0) continue;
    overlaps.push({
      symbol,
      relation,
      buys: trades.filter((t) => t.type === "buy"),
      sells: trades.filter((t) => t.type === "sell"),
      holdings,
      latest: trades[0] ?? null,
    });
  }

  return overlaps.sort((a, b) => {
    if (a.relation !== b.relation) return a.relation === "held" ? -1 : 1;
    return a.symbol.localeCompare(b.symbol);
  });
}
