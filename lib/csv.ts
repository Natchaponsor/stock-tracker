import { format } from "date-fns";
import { buildLedger } from "./ledger";
import type { Position, Strategy } from "./types";

type Cell = string | number | null;

/**
 * One CSV field. Text a spreadsheet would read as a formula (=, +, -, @, tab,
 * carriage return at the start) gets a leading apostrophe, since strategy tags
 * are free text a person typed. Numbers pass through as numbers.
 */
function field(value: Cell): string {
  if (value === null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Rows to CSV text, CRLF line endings as RFC 4180 and Excel expect. */
export function toCsv(rows: Cell[][]): string {
  return rows.map((row) => row.map(field).join(",")).join("\r\n") + "\r\n";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const LEDGER_CSV_HEADER = [
  "Date",
  "Symbol",
  "Side",
  "Shares",
  "Price (USD)",
  "Amount (USD)",
  "Realized P&L (USD)",
  "Strategy Notes",
  "Position",
];

/**
 * The recorded log as CSV, newest first, one row per buy or sell. Realized P&L
 * is filled on sells only (average-cost, matching the app). Unrealized P&L is
 * left out on purpose: it depends on a live price, so it would be stale the
 * moment the file is saved.
 */
export function buildLedgerCsv(positions: Position[], strategies: Strategy[]): string {
  const strategyName = new Map(strategies.map((s) => [s.id, s.name]));
  const byId = new Map(positions.map((p) => [p.id, p]));

  const rows: Cell[][] = buildLedger(positions, new Map()).map((row) => {
    const position = byId.get(row.positionId);
    const notes = position
      ? [
          ...position.strategyIds.map((id) => strategyName.get(id)).filter((n): n is string => Boolean(n)),
          ...position.customTags,
        ].join("; ")
      : "";
    return [
      format(new Date(row.date), "yyyy-MM-dd"),
      row.symbol,
      row.kind === "buy" ? "Buy" : "Sell",
      row.qty,
      row.price,
      round2(row.qty * row.price),
      row.kind === "sell" && row.pnl !== null ? round2(row.pnl) : null,
      notes,
      position?.status === "closed" ? "Closed" : "Open",
    ];
  });

  return toCsv([LEDGER_CSV_HEADER, ...rows]);
}
