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

/** Full snapshot of user data, for export/backup — matches the store's persisted shape. */
export interface ExportPayload {
  exportedAt: string;
  version: 1;
  startingCash: number;
  positions: Position[];
  strategies: Strategy[];
  watchlist: WatchlistItem[];
}
