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
