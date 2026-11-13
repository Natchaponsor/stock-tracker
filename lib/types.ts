export type PositionStatus = "open" | "closed";

/** A single buy or sell execution against a Position — supports scaling in/out. */
export interface Fill {
  id: string;
  date: string; // ISO
  price: number;
  qty: number;
}

/** A periodic check-in while a position is held, not a one-time closing reflection. */
export interface JournalNote {
  id: string;
  date: string; // ISO
  text: string;
  priceAtNote: number | null;
}

export interface Strategy {
  id: string;
  name: string;
  entryRule: string;
  exitRule: string;
  createdAt: string;
  /** Last change, for device sync (newer wins). Back-filled from createdAt for old data. */
  updatedAt: string;
}

/** As stored / user-editable. */
export interface Position {
  id: string;
  symbol: string;
  status: PositionStatus;
  /** Zero or more Strategy records this position is tagged with — "Strategy Notes"
   * supports multiple selections, not just one. */
  strategyIds: string[];
  /** Free-text tags alongside (or instead of) a formal Strategy — the "Other" option
   * in Strategy Notes. See lib/migratePosition.ts for how these promote to a real
   * Strategy later. */
  customTags: string[];
  thesis: string;
  stop: number | null;
  target: number | null;
  entries: Fill[];
  exits: Fill[];
  notes: JournalNote[];
  isSeed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistItem {
  symbol: string;
  addedAt: string;
  /** Last change, for device sync (newer wins). Back-filled from addedAt for old data. */
  updatedAt: string;
  note?: string;
}

/** Computed from a Position (+ live quote if open), never persisted. */
export interface PositionMetrics {
  avgEntryPrice: number;
  avgExitPrice: number | null;
  totalQtyEntered: number;
  totalQtyExited: number;
  openQty: number;
  costBasis: number;
  realizedPnl: number;
  unrealizedPnl: number | null; // null when open and no live price is available yet
  totalPnl: number | null;
  returnPct: number | null;
  daysHeld: number;
}

export interface Quote {
  symbol: string;
  price: number | null;
  changePct: number | null;
  asOf: string | null;
  error?: string;
}

export interface DailyBar {
  date: string; // YYYY-MM-DD
  close: number;
  volume: number | null;
}

/** Fundamental data — a different category from live quotes/candles, so it comes
 * from its own endpoint and (likely) its own provider. */
export interface Fundamentals {
  symbol: string;
  peRatio: number | null;
  asOf: string | null;
  error?: string;
}

export type CrossType = "golden-cross" | "death-cross";

export interface CrossSignal {
  type: CrossType;
  date: string;
  index: number;
}

/** A Navy Stream category colour a user-made sector can wear (a `--cat-*` token). */
export type SectorSwatch = "cat-transport" | "cat-food" | "cat-health" | "cat-shopping" | "cat-bills" | "cat-fun";

/** A sector the user named themselves, holding the symbols they assigned to it. */
export interface CustomSector {
  id: string;
  name: string;
  swatch: SectorSwatch;
  symbols: string[];
  /** Last change, for device sync (newer wins). */
  updatedAt: string;
}

/**
 * Cash the user put into the book, in any currency. Counts as capital, never as
 * a gain. Keyed by `id`.
 */
export interface CashDeposit {
  id: string;
  /** When the cash went in (ISO, local midnight of the picked day). */
  date: string;
  /** What was deposited, e.g. "THB". */
  currency: string;
  /** In `currency`, always above 0. */
  amount: number;
  /** Units of `currency` per 1 USD (the USD/XXX rate); 1 for USD. Dollars = amount / rate. */
  rate: number;
  /** "entered": typed by the user. "reference": the daily reference rate fetched for
   * the day. null for a USD deposit, which needs no rate. */
  rateSource: "entered" | "reference" | null;
  /** The day of the reference fix used (YYYY-MM-DD), for "reference" rates. */
  rateDate: string | null;
  note?: string;
  createdAt: string;
  /** Last change, for device sync (newer wins). */
  updatedAt: string;
}

/** A device paired through sync, listed under Settings → Devices. Keyed by `id`. */
export interface SyncDevice {
  id: string;
  name: string;
  /** When the device first joined. */
  addedAt: string;
  /** Last time it finished a sync (refreshed at most every few hours). */
  lastSeenAt: string;
  /** Last change, for device sync (newer wins). */
  updatedAt: string;
}

/** Full snapshot of user data, for export/backup — matches the store's persisted shape. */
export interface ExportPayload {
  exportedAt: string;
  /** v2 added customSectors, v3 the FX watchlist and alerts, v4 cash deposits; older files still import. */
  version: 4;
  startingCash: number;
  positions: Position[];
  strategies: Strategy[];
  watchlist: WatchlistItem[];
  customSectors: CustomSector[];
  fxWatchlist: FxWatchItem[];
  fxAlerts: FxAlert[];
  cashDeposits: CashDeposit[];
}

// ── FX ───────────────────────────────────────────────────────────────────────

/** "USD/THB" = how many THB one USD buys. Upper case, base/quote. */
export type FxPair = `${string}/${string}`;

/** Which way the user usually converts on a pair. Decides what "a better rate" means. */
export type FxDirection = "base-to-quote" | "quote-to-base";

/** A currency pair on the FX watchlist. Keyed by `pair`. */
export interface FxWatchItem {
  pair: FxPair;
  direction: FxDirection;
  addedAt: string;
  /** Last change, for device sync (newer wins). */
  updatedAt: string;
  note?: string;
}

export type FxAlertCondition = { kind: "above"; level: number } | { kind: "below"; level: number };

/** A rate alert on a pair. Keyed by `id`. */
export interface FxAlert {
  id: string;
  pair: FxPair;
  condition: FxAlertCondition;
  /** "once" disarms after it fires; "rearm" arms again once the rate is back past
   * the level by FX_REARM_GAP, so a rate sitting on the level can't fire every day. */
  repeat: "once" | "rearm";
  state: "armed" | "fired" | "paused";
  /** Date of the rate that fired it (YYYY-MM-DD). */
  firedAt: string | null;
  firedRate: number | null;
  /** False from the moment it fires until the user dismisses the call-out. */
  seen: boolean;
  note?: string;
  createdAt: string;
  /** Last change, for device sync (newer wins). */
  updatedAt: string;
}

/** One day's reference rate for a pair. Never persisted. */
export interface FxBar {
  date: string; // YYYY-MM-DD
  rate: number;
}

/** A forex headline matched to a currency by keyword. */
export interface FxNewsItem {
  headline: string;
  source: string;
  url: string;
  /** ISO time. */
  datetime: string;
  /** The currency the headline matched. */
  currency: string;
}
