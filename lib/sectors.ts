import type { CustomSector, SectorSwatch } from "./types";

/**
 * Sector lookup for the dashboard's allocation and symbol badges. Navy Stream's
 * six category colours (cat-*) are reused here for sectors; anything outside
 * this table falls into "Other", which has no category colour of its own.
 *
 * Quotes carry no sector, so this is a hand-kept table of the symbols the app
 * is likely to see. Users can also name their own sectors (CustomSector) and
 * assign symbols to them; those assignments win over this table.
 */
export type Sector =
  | "Technology"
  | "Energy"
  | "Healthcare"
  | "Consumer"
  | "Financials"
  | "Communication"
  | "Other";

/** CSS variable for each sector's colour, from styles/navy-stream/tokens.css. */
export const SECTOR_COLOR: Record<Sector, string> = {
  Technology: "var(--cat-transport)",
  Energy: "var(--cat-food)",
  Healthcare: "var(--cat-health)",
  Consumer: "var(--cat-shopping)",
  Financials: "var(--cat-bills)",
  Communication: "var(--cat-fun)",
  Other: "var(--ink-subtle)",
};

const SECTOR_BY_SYMBOL: Record<string, Sector> = {
  AAPL: "Technology",
  MSFT: "Technology",
  NVDA: "Technology",
  PLTR: "Technology",
  AMD: "Technology",
  INTC: "Technology",
  AVGO: "Technology",
  ORCL: "Technology",
  CRM: "Technology",
  ADBE: "Technology",
  TSM: "Technology",
  QCOM: "Technology",

  XOM: "Energy",
  CVX: "Energy",
  COP: "Energy",
  OXY: "Energy",
  SLB: "Energy",

  UNH: "Healthcare",
  JNJ: "Healthcare",
  LLY: "Healthcare",
  PFE: "Healthcare",
  MRK: "Healthcare",
  ABBV: "Healthcare",

  AMZN: "Consumer",
  TSLA: "Consumer",
  COST: "Consumer",
  WMT: "Consumer",
  HD: "Consumer",
  MCD: "Consumer",
  NKE: "Consumer",
  KO: "Consumer",
  PEP: "Consumer",
  SBUX: "Consumer",

  "BRK.B": "Financials",
  JPM: "Financials",
  BAC: "Financials",
  GS: "Financials",
  MS: "Financials",
  V: "Financials",
  MA: "Financials",

  GOOGL: "Communication",
  GOOG: "Communication",
  META: "Communication",
  NFLX: "Communication",
  DIS: "Communication",
  T: "Communication",
  VZ: "Communication",
};

export function sectorOf(symbol: string): Sector {
  return SECTOR_BY_SYMBOL[symbol.toUpperCase()] ?? "Other";
}

/** The category colours a user-made sector can pick from, in picker order. */
export const SECTOR_SWATCHES: readonly SectorSwatch[] = [
  "cat-transport",
  "cat-food",
  "cat-health",
  "cat-shopping",
  "cat-bills",
  "cat-fun",
];

export interface ResolvedSector {
  /** Stable grouping key: the built-in sector name, or `custom:<id>`. */
  key: string;
  name: string;
  color: string;
  builtIn: Sector | null;
}

/** The sector a symbol shows under: a custom assignment if there is one, else the built-in table. */
export function resolveSector(symbol: string, customSectors: CustomSector[]): ResolvedSector {
  const upper = symbol.toUpperCase();
  const custom = customSectors.find((c) => c.symbols.includes(upper));
  if (custom) {
    return { key: `custom:${custom.id}`, name: custom.name, color: `var(--${custom.swatch})`, builtIn: null };
  }
  const sector = sectorOf(upper);
  return { key: sector, name: sector, color: SECTOR_COLOR[sector], builtIn: sector };
}
