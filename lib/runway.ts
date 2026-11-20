import { format, parse, subMonths } from "date-fns";
import { depositUsd } from "./cash";
import { computePositionMetrics } from "./positionMetrics";
import { splitAdjustedCloses } from "./priceHistory";
import { resolveSector } from "./sectors";
import type { CashDeposit, CustomSector, DailyBar, Position, Quote } from "./types";

/**
 * The Runway card's numbers: capital put in over time, the book's value each
 * trading day, and how each sector moved over a range.
 *
 * Every fill and deposit is dated, so the book on any past day (cash and shares
 * held) is exact. Only prices come from outside: daily closes, restated for
 * splits. Today's point uses live quotes, so the line ends where the banner is,
 * unless a quote is older than the latest close, which then wins.
 */

export type RunwayRange = "1D" | "1M" | "3M" | "YTD" | "All";

const EPSILON = 1e-9;

/** The local calendar day of an ISO time, as YYYY-MM-DD (fills and deposits are stored at local midnight). */
export function dayKey(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

/** Local midnight of a YYYY-MM-DD day, in ms, for a time axis. */
export function dayTime(day: string): number {
  return parse(day, "yyyy-MM-dd", new Date()).getTime();
}

/** The first day anything happened in the book (a fill or a deposit), or null for an empty book. */
export function bookStart(positions: Position[], deposits: CashDeposit[]): string | null {
  let first: string | null = null;
  const see = (iso: string) => {
    const day = dayKey(iso);
    if (first === null || day < first) first = day;
  };
  for (const p of positions) {
    for (const f of p.entries) see(f.date);
    for (const f of p.exits) see(f.date);
  }
  for (const d of deposits) see(d.date);
  return first;
}

/** The first day a range covers ("" for All). 1D starts today, so its base is the last close before it. */
export function rangeStart(range: RunwayRange, today: string): string {
  const base = parse(today, "yyyy-MM-dd", new Date());
  switch (range) {
    case "1D":
      return today;
    case "1M":
      return format(subMonths(base, 1), "yyyy-MM-dd");
    case "3M":
      return format(subMonths(base, 3), "yyyy-MM-dd");
    case "YTD":
      return `${today.slice(0, 4)}-01-01`;
    case "All":
      return "";
  }
}

// ── Capital ──────────────────────────────────────────────────────────────────

export interface CapitalStep {
  date: string;
  /** Capital after this day: starting cash plus every deposit so far, in dollars. */
  capital: number;
  /** What went in on this day. */
  added: number;
  deposits: CashDeposit[];
}

/**
 * Capital as steps: the starting cash on the book's first day (it has no date of
 * its own), then one step per day with deposits.
 */
export function capitalSteps(startingCash: number, deposits: CashDeposit[], start: string): CapitalStep[] {
  const steps: CapitalStep[] = [{ date: start, capital: startingCash, added: startingCash, deposits: [] }];
  const sorted = [...deposits].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let capital = startingCash;
  for (const deposit of sorted) {
    const usd = depositUsd(deposit);
    capital += usd;
    const day = dayKey(deposit.date) < start ? start : dayKey(deposit.date);
    const last = steps[steps.length - 1];
    if (last.date === day) {
      last.capital = capital;
      last.added += usd;
      last.deposits.push(deposit);
    } else {
      steps.push({ date: day, capital, added: usd, deposits: [deposit] });
    }
  }
  return steps;
}

/** Capital at the end of `day`. */
export function capitalAt(steps: CapitalStep[], day: string): number {
  let capital = steps.length > 0 ? steps[0].capital - steps[0].added : 0;
  for (const step of steps) {
    if (step.date > day) break;
    capital = step.capital;
  }
  return capital;
}

// ── Daily value ──────────────────────────────────────────────────────────────

export interface SectorInfo {
  key: string;
  name: string;
  color: string;
}

export interface ValuePoint {
  date: string;
  /** Cash plus holdings at that day's close (today: live prices). */
  value: number;
  capital: number;
  cash: number;
  /** Holdings value by sector key. */
  sectors: Record<string, number>;
  /** Today's point, priced from live quotes. */
  live: boolean;
}

export interface ValueSeries {
  points: ValuePoint[];
  sectors: Map<string, SectorInfo>;
  /** Symbols held at some point that have no price history; they're valued at their fill price. */
  unpriced: string[];
}

interface BookEvent {
  day: string;
  symbol: string | null;
  qty: number;
  cash: number;
  capital: number;
  price: number;
}

function bookEvents(positions: Position[], deposits: CashDeposit[]): BookEvent[] {
  const events: BookEvent[] = [];
  for (const p of positions) {
    for (const f of p.entries) {
      events.push({ day: dayKey(f.date), symbol: p.symbol, qty: f.qty, cash: -f.price * f.qty, capital: 0, price: f.price });
    }
    for (const f of p.exits) {
      events.push({ day: dayKey(f.date), symbol: p.symbol, qty: -f.qty, cash: f.price * f.qty, capital: 0, price: f.price });
    }
  }
  for (const d of deposits) {
    const usd = depositUsd(d);
    events.push({ day: dayKey(d.date), symbol: null, qty: 0, cash: usd, capital: usd, price: 0 });
  }
  return events.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

/** A US close is final by 20:00 UTC (16:00 New York in summer; 21:00 in winter, so this errs early). */
const CLOSE_UTC = "T20:00:00Z";

/**
 * A quote's price, unless the price history already has a later close: quotes
 * are refreshed on demand and can be a day behind, and the line shouldn't step
 * back in time at its last point.
 */
function freshQuote(quote: Quote | undefined, lastBarDay: string | undefined): number | null {
  if (!quote || quote.price === null) return null;
  if (lastBarDay && quote.asOf && Date.parse(quote.asOf) < Date.parse(`${lastBarDay}${CLOSE_UTC}`)) return null;
  return quote.price;
}

export function buildValueSeries(input: {
  positions: Position[];
  startingCash: number;
  deposits: CashDeposit[];
  bars: Map<string, DailyBar[]>;
  quotes: Map<string, Quote>;
  customSectors: CustomSector[];
  today: string;
}): ValueSeries {
  const { positions, startingCash, deposits, bars, quotes, customSectors, today } = input;
  const sectors = new Map<string, SectorInfo>();
  const start = bookStart(positions, deposits);
  if (start === null) return { points: [], sectors, unpriced: [] };

  const closes = new Map<string, Map<string, number>>();
  const days = new Set<string>([today]);
  for (const [symbol, list] of bars) {
    closes.set(symbol, splitAdjustedCloses(list));
    for (const bar of list) if (bar.date >= start && bar.date < today) days.add(bar.date);
  }
  const ordered = Array.from(days).sort();

  const sectorOf = new Map<string, SectorInfo>();
  const sectorFor = (symbol: string): SectorInfo => {
    let info = sectorOf.get(symbol);
    if (!info) {
      const r = resolveSector(symbol, customSectors);
      info = { key: r.key, name: r.name, color: r.color };
      sectorOf.set(symbol, info);
      sectors.set(info.key, info);
    }
    return info;
  };

  const events = bookEvents(positions, deposits);
  const held = new Map<string, number>();
  const lastClose = new Map<string, number>();
  const lastCloseDay = new Map<string, string>();
  const lastFill = new Map<string, number>();
  const everHeld = new Set<string>();
  let cash = startingCash;
  let capital = startingCash;
  let next = 0;
  const points: ValuePoint[] = [];

  for (const day of ordered) {
    while (next < events.length && events[next].day <= day) {
      const e = events[next++];
      cash += e.cash;
      capital += e.capital;
      if (e.symbol) {
        held.set(e.symbol, (held.get(e.symbol) ?? 0) + e.qty);
        lastFill.set(e.symbol, e.price);
        everHeld.add(e.symbol);
      }
    }
    for (const [symbol, byDay] of closes) {
      const close = byDay.get(day);
      if (close !== undefined) {
        lastClose.set(symbol, close);
        lastCloseDay.set(symbol, day);
      }
    }

    const live = day === today;
    const bySector: Record<string, number> = {};
    let holdings = 0;
    for (const [symbol, qty] of held) {
      if (Math.abs(qty) < EPSILON) continue;
      const quoted = live ? freshQuote(quotes.get(symbol), lastCloseDay.get(symbol)) : null;
      const price = quoted ?? lastClose.get(symbol) ?? lastFill.get(symbol) ?? 0;
      const value = qty * price;
      holdings += value;
      const key = sectorFor(symbol).key;
      bySector[key] = (bySector[key] ?? 0) + value;
    }
    points.push({ date: day, value: cash + holdings, capital, cash, sectors: bySector, live });
  }

  const unpriced = Array.from(everHeld).filter((s) => !(bars.get(s)?.length)).sort();
  return { points, sectors, unpriced };
}

// ── Sector movement ──────────────────────────────────────────────────────────

export interface SectorMove extends SectorInfo {
  /** Gain or loss over the range: change in value, less money put in or taken out by trades. */
  change: number;
}

export interface SectorMoves {
  moves: SectorMove[];
  total: number;
  /** The close the range is measured from (null: from the book's start). */
  from: string | null;
  to: string;
}

/**
 * How much each sector made or lost over a range. A buy adds value without being
 * a gain and a sell removes it without being a loss, so trades inside the range
 * are taken out: change = value at end − value at start − (bought − sold).
 */
export function sectorMoves(
  series: ValueSeries,
  range: RunwayRange,
  today: string,
  positions: Position[],
  customSectors: CustomSector[]
): SectorMoves | null {
  const { points } = series;
  if (points.length === 0) return null;
  const end = points[points.length - 1];
  const startDay = rangeStart(range, today);
  let base: ValuePoint | null = null;
  for (const p of points) {
    if (p.date >= startDay) break;
    base = p;
  }
  // 1D needs yesterday's close; without history there isn't one.
  if (range === "1D" && base === null) return null;

  const flows: Record<string, number> = {};
  const info = new Map(series.sectors);
  for (const p of positions) {
    const r = resolveSector(p.symbol, customSectors);
    if (!info.has(r.key)) info.set(r.key, { key: r.key, name: r.name, color: r.color });
    const inRange = (iso: string) => {
      const day = dayKey(iso);
      return (base === null || day > base.date) && day <= end.date;
    };
    for (const f of p.entries) if (inRange(f.date)) flows[r.key] = (flows[r.key] ?? 0) + f.price * f.qty;
    for (const f of p.exits) if (inRange(f.date)) flows[r.key] = (flows[r.key] ?? 0) - f.price * f.qty;
  }

  const keys = new Set([...Object.keys(end.sectors), ...Object.keys(base?.sectors ?? {}), ...Object.keys(flows)]);
  const moves: SectorMove[] = [];
  for (const key of keys) {
    const change = (end.sectors[key] ?? 0) - (base?.sectors[key] ?? 0) - (flows[key] ?? 0);
    const sector = info.get(key);
    if (!sector || Math.abs(change) < 0.005) continue;
    moves.push({ ...sector, change });
  }
  moves.sort((a, b) => b.change - a.change);
  return { moves, total: moves.reduce((a, m) => a + m.change, 0), from: base?.date ?? null, to: end.date };
}

/** Today's move by sector from live quotes alone, for when there's no price history to measure from. */
export function dayMovesFromQuotes(
  positions: Position[],
  quotes: Map<string, Quote>,
  customSectors: CustomSector[],
  today: string
): SectorMoves | null {
  const bySector = new Map<string, SectorMove>();
  let counted = 0;
  for (const p of positions) {
    if (p.status !== "open") continue;
    const q = quotes.get(p.symbol);
    if (!q || q.price === null || q.changePct === null) continue;
    const { openQty } = computePositionMetrics(p, q.price);
    if (openQty <= 0) continue;
    const prevClose = q.price / (1 + q.changePct / 100);
    const r = resolveSector(p.symbol, customSectors);
    const move = bySector.get(r.key) ?? { key: r.key, name: r.name, color: r.color, change: 0 };
    move.change += (q.price - prevClose) * openQty;
    bySector.set(r.key, move);
    counted += 1;
  }
  if (counted === 0) return null;
  const moves = Array.from(bySector.values()).sort((a, b) => b.change - a.change);
  return { moves, total: moves.reduce((a, m) => a + m.change, 0), from: null, to: today };
}
