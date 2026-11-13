import type { CustomSector, ExportPayload, FxAlert, FxWatchItem, Position, Strategy, WatchlistItem } from "./types";
import { normalizeSector, normalizeStrategy, normalizeWatchItem } from "./sync/book";
import { SECTOR_SWATCHES } from "./sectors";
import { migratePositionShape } from "./migratePosition";

export function buildExportPayload(
  startingCash: number,
  positions: Position[],
  strategies: Strategy[],
  watchlist: WatchlistItem[],
  customSectors: CustomSector[] = [],
  fxWatchlist: FxWatchItem[] = [],
  fxAlerts: FxAlert[] = []
): ExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    version: 3,
    startingCash,
    positions,
    strategies,
    watchlist,
    customSectors,
    fxWatchlist,
    fxAlerts,
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

const PAIR_RE = /^[A-Z]{3}\/[A-Z]{3}$/;

function isFxWatchItem(v: unknown): v is FxWatchItem {
  if (typeof v !== "object" || v === null) return false;
  const w = v as Record<string, unknown>;
  return (
    typeof w.pair === "string" &&
    PAIR_RE.test(w.pair) &&
    (w.direction === "base-to-quote" || w.direction === "quote-to-base") &&
    typeof w.addedAt === "string"
  );
}

function isFxAlert(v: unknown): v is FxAlert {
  if (typeof v !== "object" || v === null) return false;
  const a = v as Record<string, unknown>;
  const c = a.condition as Record<string, unknown> | null;
  return (
    typeof a.id === "string" &&
    typeof a.pair === "string" &&
    PAIR_RE.test(a.pair) &&
    typeof c === "object" &&
    c !== null &&
    (c.kind === "above" || c.kind === "below") &&
    typeof c.level === "number" &&
    Number.isFinite(c.level) &&
    (a.repeat === "once" || a.repeat === "rearm") &&
    (a.state === "armed" || a.state === "fired" || a.state === "paused")
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

  // Version 3 added FX; older files have none.
  if (p.fxWatchlist !== undefined && (!Array.isArray(p.fxWatchlist) || !p.fxWatchlist.every(isFxWatchItem))) {
    return { ok: false, error: "Invalid \"fxWatchlist\" field." };
  }
  if (p.fxAlerts !== undefined && (!Array.isArray(p.fxAlerts) || !p.fxAlerts.every(isFxAlert))) {
    return { ok: false, error: "Invalid \"fxAlerts\" field." };
  }
  const at = new Date().toISOString();

  return {
    ok: true,
    payload: {
      exportedAt: typeof p.exportedAt === "string" ? p.exportedAt : new Date().toISOString(),
      version: 3,
      startingCash: p.startingCash,
      // Normalizes pre-multi-strategy exports (a bare `strategyId`) into strategyIds/customTags.
      positions: p.positions.map((pos) => migratePositionShape(pos as unknown as Record<string, unknown>)),
      // Files from before device sync have no updatedAt on these; fill it in.
      strategies: p.strategies.map(normalizeStrategy),
      watchlist: p.watchlist.map(normalizeWatchItem),
      customSectors: ((p.customSectors as CustomSector[] | undefined) ?? []).map(normalizeSector),
      fxWatchlist: ((p.fxWatchlist as FxWatchItem[] | undefined) ?? []).map((w) => ({
        pair: w.pair,
        direction: w.direction,
        addedAt: w.addedAt,
        updatedAt: w.updatedAt ?? at,
        ...(typeof w.note === "string" ? { note: w.note } : {}),
      })),
      fxAlerts: ((p.fxAlerts as FxAlert[] | undefined) ?? []).map((a) => ({
        id: a.id,
        pair: a.pair,
        condition: { kind: a.condition.kind, level: a.condition.level },
        repeat: a.repeat,
        state: a.state,
        firedAt: typeof a.firedAt === "string" ? a.firedAt : null,
        firedRate: typeof a.firedRate === "number" ? a.firedRate : null,
        seen: true,
        createdAt: typeof a.createdAt === "string" ? a.createdAt : at,
        updatedAt: typeof a.updatedAt === "string" ? a.updatedAt : at,
        ...(typeof a.note === "string" ? { note: a.note } : {}),
      })),
    },
  };
}

export function downloadJson(filename: string, payload: unknown) {
  downloadText(filename, JSON.stringify(payload, null, 2), "application/json;charset=utf-8;");
}

/** Saves text as a file through a temporary link; the data never leaves the browser. */
export function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
