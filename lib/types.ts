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
  strategyId: string | null;
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
}

export type CrossType = "golden-cross" | "death-cross";

export interface CrossSignal {
  type: CrossType;
  date: string;
  index: number;
}
