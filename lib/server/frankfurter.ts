import { splitPair } from "@/lib/fx";
import type { FxBar, FxPair } from "@/lib/types";

// Frankfurter (https://frankfurter.dev): free daily reference rates from central
// banks, no key. Rates are blended across sources unless `providers` names one
// (e.g. BOT, the Bank of Thailand's commercial-bank rate).

const API = "https://api.frankfurter.dev/v2";

/** Sources publish a few times a day; a few hours of cache keeps us well inside fair use. */
export const FX_REVALIDATE_SECONDS = 60 * 60 * 3;

interface FrankfurterRow {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

export class FrankfurterError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: FX_REVALIDATE_SECONDS },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data as { message?: string } | null)?.message ?? `upstream ${res.status}`;
    throw new FrankfurterError(message, res.status);
  }
  return data;
}

/** Daily fixes for `pair` from `from` (YYYY-MM-DD) to today, oldest first. */
export async function fetchSeries(pair: FxPair, from: string, provider?: string): Promise<FxBar[]> {
  const [base, quote] = splitPair(pair);
  const params = new URLSearchParams({ base: base.toLowerCase(), quotes: quote.toLowerCase(), from });
  if (provider) params.set("providers", provider);
  const rows = (await getJson(`${API}/rates?${params}`)) as FrankfurterRow[];
  if (!Array.isArray(rows)) throw new FrankfurterError("unexpected response", 502);
  return rows
    .filter((r) => r.quote === quote && typeof r.rate === "number")
    .map((r) => ({ date: r.date, rate: r.rate }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** The latest fix for several quotes against one base, in one request. */
export async function fetchLatestForBase(base: string, quotes: string[]): Promise<Map<string, { rate: number; date: string }>> {
  const from = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
  const params = new URLSearchParams({ base: base.toLowerCase(), quotes: quotes.join(",").toLowerCase(), from });
  const rows = (await getJson(`${API}/rates?${params}`)) as FrankfurterRow[];
  const out = new Map<string, { rate: number; date: string }>();
  if (!Array.isArray(rows)) return out;
  for (const r of rows) {
    const current = out.get(r.quote);
    if (!current || r.date >= current.date) out.set(r.quote, { rate: r.rate, date: r.date });
  }
  return out;
}

/** The latest rate for each pair, grouped by base so it's one request per base currency. */
export async function fetchLatest(pairs: FxPair[]): Promise<Map<FxPair, { rate: number; date: string }>> {
  const byBase = new Map<string, string[]>();
  for (const pair of pairs) {
    const [base, quote] = splitPair(pair);
    byBase.set(base, [...(byBase.get(base) ?? []), quote]);
  }
  const out = new Map<FxPair, { rate: number; date: string }>();
  await Promise.all(
    Array.from(byBase, async ([base, quotes]) => {
      const latest = await fetchLatestForBase(base, quotes);
      for (const [quote, value] of latest) out.set(`${base}/${quote}`, value);
    })
  );
  return out;
}
