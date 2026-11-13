import type {
  CashDeposit,
  CustomSector,
  Fill,
  FxAlert,
  FxWatchItem,
  JournalNote,
  Position,
  Strategy,
  SyncDevice,
  WatchlistItem,
} from "../types";

/**
 * The part of the store that device sync carries. Per-device settings (theme,
 * hide amounts, backup dates, the seeded flag) are not in it.
 *
 * Every item carries `updatedAt`; deletions are kept as tombstones so a merge
 * can tell "deleted on the other device" from "not created there yet".
 */
export interface SyncBook {
  positions: Position[];
  strategies: Strategy[];
  /** In display order. */
  watchlist: WatchlistItem[];
  customSectors: CustomSector[];
  startingCash: number;
  startingCashUpdatedAt: string | null;
  /** When the watchlist was last reordered; the newer order wins in a merge. */
  watchlistOrderUpdatedAt: string | null;
  /** FX pairs, in display order. */
  fxWatchlist: FxWatchItem[];
  /** When the FX watchlist was last reordered; the newer order wins in a merge. */
  fxWatchlistOrderUpdatedAt: string | null;
  fxAlerts: FxAlert[];
  /** Cash put into the book, in any currency. */
  cashDeposits: CashDeposit[];
  /** The devices sharing this book. Each one keeps its own entry fresh. */
  devices: SyncDevice[];
  /** `kind:key` → when it was deleted. Keys: position/strategy/sector/FX alert/deposit/
   * device ids, watch symbols, FX pairs. */
  deletions: Record<string, string>;
}

export type DeletionKind = "position" | "strategy" | "watch" | "sector" | "fxwatch" | "fxalert" | "deposit" | "device";

export const deletionKey = (kind: DeletionKind, key: string) => `${kind}:${key}`;

/** Tombstones older than this are dropped; a device offline longer could bring an item back. */
export const TOMBSTONE_TTL_DAYS = 90;
const DAY_MS = 24 * 60 * 60_000;

// ── Back-fill for data saved before sync existed ─────────────────────────────

const EPOCH = new Date(0).toISOString();

export function normalizeStrategy(raw: Strategy | Omit<Strategy, "updatedAt">): Strategy {
  const s = raw as Strategy;
  return { ...s, updatedAt: s.updatedAt ?? s.createdAt ?? EPOCH };
}

export function normalizeWatchItem(raw: WatchlistItem | Omit<WatchlistItem, "updatedAt">): WatchlistItem {
  const w = raw as WatchlistItem;
  return { ...w, updatedAt: w.updatedAt ?? w.addedAt ?? EPOCH };
}

export function normalizeSector(raw: CustomSector | Omit<CustomSector, "updatedAt">): CustomSector {
  const c = raw as CustomSector;
  return { ...c, updatedAt: c.updatedAt ?? EPOCH };
}

/** Fills in collections a book from before FX, cash deposits or the device list doesn't have. */
export function normalizeSyncBook(book: SyncBook): SyncBook {
  const b = book as Partial<SyncBook> & SyncBook;
  return {
    ...b,
    fxWatchlist: Array.isArray(b.fxWatchlist) ? b.fxWatchlist : [],
    fxWatchlistOrderUpdatedAt: b.fxWatchlistOrderUpdatedAt ?? null,
    fxAlerts: Array.isArray(b.fxAlerts) ? b.fxAlerts.map((a) => ({ ...a, seen: a.seen ?? true })) : [],
    cashDeposits: Array.isArray(b.cashDeposits) ? b.cashDeposits : [],
    devices: Array.isArray(b.devices) ? b.devices : [],
  };
}

// ── Merge ────────────────────────────────────────────────────────────────────

/** Newer `updatedAt` wins; an exact tie is broken the same way on every device. */
function newer<T extends { updatedAt: string }>(a: T, b: T): T {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
}

/** Union by id, oldest first. Fills and notes are only ever added, so nothing is lost. */
function unionById<T extends { id: string; date: string }>(a: T[], b: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of [...a, ...b]) if (!byId.has(item.id)) byId.set(item.id, item);
  return Array.from(byId.values()).sort((x, y) => (x.date === y.date ? x.id.localeCompare(y.id) : x.date.localeCompare(y.date)));
}

function mergePosition(a: Position, b: Position): Position {
  const winner = newer(a, b);
  return {
    ...winner,
    entries: unionById<Fill>(a.entries, b.entries),
    exits: unionById<Fill>(a.exits, b.exits),
    notes: unionById<JournalNote>(a.notes, b.notes),
  };
}

/**
 * Joins two lists by key: items on one side only are kept, items on both are
 * merged. Anything with a tombstone at or after its `updatedAt` is dropped.
 */
function mergeList<T extends { updatedAt: string }>(
  a: T[],
  b: T[],
  keyOf: (item: T) => string,
  kind: DeletionKind,
  deletions: Record<string, string>,
  combine: (x: T, y: T) => T = newer
): T[] {
  const byKey = new Map<string, T>();
  for (const item of a) byKey.set(keyOf(item), item);
  for (const item of b) {
    const key = keyOf(item);
    const existing = byKey.get(key);
    byKey.set(key, existing ? combine(existing, item) : item);
  }
  return Array.from(byKey.values()).filter((item) => {
    const deletedAt = deletions[deletionKey(kind, keyOf(item))];
    return deletedAt === undefined || item.updatedAt > deletedAt;
  });
}

function mergeDeletions(a: Record<string, string>, b: Record<string, string>, now: number) {
  const cutoff = new Date(now - TOMBSTONE_TTL_DAYS * DAY_MS).toISOString();
  const merged: Record<string, string> = {};
  for (const source of [a, b]) {
    for (const [key, at] of Object.entries(source)) {
      if (at < cutoff) continue;
      if (!merged[key] || at > merged[key]) merged[key] = at;
    }
  }
  return merged;
}

/** Puts merged list items in the order of whichever side reordered last; newcomers go last. */
function orderList<T>(items: T[], preferred: T[], other: T[], keyOf: (item: T) => string): T[] {
  const byKey = new Map(items.map((w) => [keyOf(w), w]));
  const ordered: T[] = [];
  for (const source of [preferred, other]) {
    for (const w of source) {
      const item = byKey.get(keyOf(w));
      if (item) {
        ordered.push(item);
        byKey.delete(keyOf(w));
      }
    }
  }
  return ordered;
}

/**
 * Merges an ordered list: items merge one by one, then take the order of the side
 * whose `orderUpdatedAt` is newer (ties broken the same way on every device).
 */
function mergeOrdered<T extends { updatedAt: string }>(
  a: T[],
  b: T[],
  aOrderAt: string | null,
  bOrderAt: string | null,
  keyOf: (item: T) => string,
  kind: DeletionKind,
  deletions: Record<string, string>
): T[] {
  const aOrderNewer =
    (aOrderAt ?? "") !== (bOrderAt ?? "")
      ? (aOrderAt ?? "") > (bOrderAt ?? "")
      : JSON.stringify(a.map(keyOf)) >= JSON.stringify(b.map(keyOf));
  const items = mergeList(a, b, keyOf, kind, deletions);
  return aOrderNewer ? orderList(items, a, b, keyOf) : orderList(items, b, a, keyOf);
}

function laterOf(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return a > b ? a : b;
}

/**
 * Merges two copies of the book into one. Symmetric: merging A into B gives the
 * same result as B into A, so every device converges on the same book.
 */
export function mergeBooks(rawA: SyncBook, rawB: SyncBook, now: number = Date.now()): SyncBook {
  // Either side may come from a device that predates FX.
  const a = normalizeSyncBook(rawA);
  const b = normalizeSyncBook(rawB);
  const deletions = mergeDeletions(a.deletions, b.deletions, now);

  const cashFromA =
    (a.startingCashUpdatedAt ?? "") !== (b.startingCashUpdatedAt ?? "")
      ? (a.startingCashUpdatedAt ?? "") > (b.startingCashUpdatedAt ?? "")
      : a.startingCash >= b.startingCash;

  return {
    positions: mergeList(a.positions, b.positions, (p) => p.id, "position", deletions, mergePosition),
    strategies: mergeList(a.strategies, b.strategies, (s) => s.id, "strategy", deletions),
    watchlist: mergeOrdered<WatchlistItem>(
      a.watchlist, b.watchlist, a.watchlistOrderUpdatedAt, b.watchlistOrderUpdatedAt, (w) => w.symbol, "watch", deletions
    ),
    customSectors: exclusiveSectorSymbols(
      mergeList(a.customSectors, b.customSectors, (c) => c.id, "sector", deletions)
    ),
    startingCash: cashFromA ? a.startingCash : b.startingCash,
    startingCashUpdatedAt: laterOf(a.startingCashUpdatedAt, b.startingCashUpdatedAt),
    watchlistOrderUpdatedAt: laterOf(a.watchlistOrderUpdatedAt, b.watchlistOrderUpdatedAt),
    fxWatchlist: mergeOrdered<FxWatchItem>(
      a.fxWatchlist, b.fxWatchlist, a.fxWatchlistOrderUpdatedAt, b.fxWatchlistOrderUpdatedAt, (w) => w.pair, "fxwatch", deletions
    ),
    fxWatchlistOrderUpdatedAt: laterOf(a.fxWatchlistOrderUpdatedAt, b.fxWatchlistOrderUpdatedAt),
    fxAlerts: mergeList(a.fxAlerts, b.fxAlerts, (x) => x.id, "fxalert", deletions),
    cashDeposits: sortByDate(mergeList(a.cashDeposits, b.cashDeposits, (d) => d.id, "deposit", deletions)),
    devices: mergeList(a.devices, b.devices, (d) => d.id, "device", deletions).sort((x, y) =>
      x.addedAt === y.addedAt ? x.id.localeCompare(y.id) : x.addedAt.localeCompare(y.addedAt)
    ),
    deletions,
  };
}

/** Oldest first, ties by id, so both devices list deposits in the same order. */
function sortByDate<T extends { id: string; date: string }>(items: T[]): T[] {
  return items.sort((x, y) => (x.date === y.date ? x.id.localeCompare(y.id) : x.date.localeCompare(y.date)));
}

/**
 * A symbol belongs to at most one custom sector. Two devices can each assign the
 * same symbol to a different sector; the sector changed most recently keeps it.
 */
function exclusiveSectorSymbols(sectors: CustomSector[]): CustomSector[] {
  const owner = new Map<string, CustomSector>();
  for (const sector of sectors) {
    for (const symbol of sector.symbols) {
      const current = owner.get(symbol);
      if (!current || newer(current, sector) === sector) owner.set(symbol, sector);
    }
  }
  return sectors.map((sector) => {
    const symbols = sector.symbols.filter((symbol) => owner.get(symbol) === sector);
    return symbols.length === sector.symbols.length ? sector : { ...sector, symbols };
  });
}

/** True when two books hold the same data (used to skip pushes that change nothing). */
export function sameBook(a: SyncBook, b: SyncBook): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
