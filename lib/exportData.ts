import type { ExportPayload, Position, Strategy, WatchlistItem } from "./types";

export function buildExportPayload(
  startingCash: number,
  positions: Position[],
  strategies: Strategy[],
  watchlist: WatchlistItem[]
): ExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    startingCash,
    positions,
    strategies,
    watchlist,
  };
}

export type ImportResult =
  | { ok: true; payload: ExportPayload }
  | { ok: false; error: string };

function isPosition(v: unknown): v is Position {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.symbol === "string" &&
    (p.status === "open" || p.status === "closed") &&
    Array.isArray(p.entries) &&
    Array.isArray(p.exits) &&
    Array.isArray(p.notes)
  );
}

function isStrategy(v: unknown): v is Strategy {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return typeof s.id === "string" && typeof s.name === "string";
}

function isWatchlistItem(v: unknown): v is WatchlistItem {
  if (typeof v !== "object" || v === null) return false;
  const w = v as Record<string, unknown>;
  return typeof w.symbol === "string" && typeof w.addedAt === "string";
}

/** Validates a parsed JSON blob against the export shape before it ever touches the store. */
export function validateImportPayload(json: unknown): ImportResult {
  if (typeof json !== "object" || json === null) {
    return { ok: false, error: "That file doesn't look like a Stock Tracker export (not a JSON object)." };
  }

  const p = json as Record<string, unknown>;

  if (typeof p.startingCash !== "number" || !Number.isFinite(p.startingCash)) {
    return { ok: false, error: "Missing or invalid \"startingCash\" field." };
  }
  if (!Array.isArray(p.positions) || !p.positions.every(isPosition)) {
    return { ok: false, error: "Missing or invalid \"positions\" field." };
  }
  if (!Array.isArray(p.strategies) || !p.strategies.every(isStrategy)) {
    return { ok: false, error: "Missing or invalid \"strategies\" field." };
  }
  if (!Array.isArray(p.watchlist) || !p.watchlist.every(isWatchlistItem)) {
    return { ok: false, error: "Missing or invalid \"watchlist\" field." };
  }

  return {
    ok: true,
    payload: {
      exportedAt: typeof p.exportedAt === "string" ? p.exportedAt : new Date().toISOString(),
      version: 1,
      startingCash: p.startingCash,
      positions: p.positions,
      strategies: p.strategies,
      watchlist: p.watchlist,
    },
  };
}

export function downloadJson(filename: string, payload: unknown) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
