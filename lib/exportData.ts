import type { CustomSector, ExportPayload, Position, Strategy, WatchlistItem } from "./types";
import { SECTOR_SWATCHES } from "./sectors";
import { migratePositionShape } from "./migratePosition";

export function buildExportPayload(
  startingCash: number,
  positions: Position[],
  strategies: Strategy[],
  watchlist: WatchlistItem[],
  customSectors: CustomSector[] = []
): ExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    version: 2,
    startingCash,
    positions,
    strategies,
    watchlist,
    customSectors,
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

function isCustomSector(v: unknown): v is CustomSector {
  if (typeof v !== "object" || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    (SECTOR_SWATCHES as readonly unknown[]).includes(c.swatch) &&
    Array.isArray(c.symbols) &&
    c.symbols.every((s) => typeof s === "string")
  );
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

  // Version 1 exports predate custom sectors, so the field is optional.
  if (p.customSectors !== undefined && (!Array.isArray(p.customSectors) || !p.customSectors.every(isCustomSector))) {
    return { ok: false, error: "Invalid \"customSectors\" field." };
  }

  return {
    ok: true,
    payload: {
      exportedAt: typeof p.exportedAt === "string" ? p.exportedAt : new Date().toISOString(),
      version: 2,
      startingCash: p.startingCash,
      // Normalizes pre-multi-strategy exports (a bare `strategyId`) into strategyIds/customTags.
      positions: p.positions.map((pos) => migratePositionShape(pos as unknown as Record<string, unknown>)),
      strategies: p.strategies,
      watchlist: p.watchlist,
      customSectors: (p.customSectors as CustomSector[] | undefined) ?? [],
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
