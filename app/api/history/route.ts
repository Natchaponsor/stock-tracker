import { NextRequest, NextResponse } from "next/server";
import type { DailyBar } from "@/lib/types";
import { secondsUntilNextClose } from "@/lib/priceHistory";

/**
 * Daily closes for one symbol, from Tiingo (free key, years of end-of-day prices).
 * Finnhub, which serves live quotes, keeps its daily candles for paid plans.
 *
 * `from` (YYYY-MM-DD) asks for bars from that day on, so a device that already has
 * older bars cached only fetches the newest days. Without it, two years come back.
 *
 * A past close never changes, so responses are kept until the next close is out
 * (US market close plus Tiingo's end-of-day run). Every device asking for the same
 * symbol and day in between is served from the cache, not from Tiingo.
 */

const TIINGO_URL = (ticker: string, from: string) =>
  `https://api.tiingo.com/tiingo/daily/${encodeURIComponent(ticker)}/prices?startDate=${from}`;

const TWO_YEARS_MS = 1000 * 60 * 60 * 24 * 365 * 2;
const SYMBOL_PATTERN = /^[A-Z0-9.\-]{1,12}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface HistoryResponse {
  symbol: string;
  bars: DailyBar[];
  error?: string;
}

interface TiingoBar {
  date: string;
  close: number;
  volume?: number;
  splitFactor?: number;
}

async function fetchTiingo(symbol: string, from: string, apiKey: string, revalidate: number): Promise<HistoryResponse> {
  try {
    // Tiingo writes share classes with a dash: BRK.B → BRK-B.
    const res = await fetch(TIINGO_URL(symbol.replace(/\./g, "-"), from), {
      headers: { Accept: "application/json", Authorization: `Token ${apiKey}` },
      next: { revalidate },
    });
    if (res.status === 404) return { symbol, bars: [], error: "unknown symbol" };
    if (res.status === 429) return { symbol, bars: [], error: "rate limited" };
    if (!res.ok) return { symbol, bars: [], error: `upstream ${res.status}` };

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return { symbol, bars: [], error: "no data" };

    const bars: DailyBar[] = (data as TiingoBar[])
      .filter((b) => typeof b.date === "string" && Number.isFinite(b.close))
      .map((b) => {
        const bar: DailyBar = { date: b.date.slice(0, 10), close: b.close, volume: b.volume ?? null };
        if (b.splitFactor && b.splitFactor !== 1) bar.splitFactor = b.splitFactor;
        return bar;
      });
    return { symbol, bars };
  } catch {
    return { symbol, bars: [], error: "fetch failed" };
  }
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!SYMBOL_PATTERN.test(symbol)) {
    return NextResponse.json({ symbol, bars: [], error: "missing symbol" }, { status: 400 });
  }

  const fromParam = request.nextUrl.searchParams.get("from");
  if (fromParam !== null && !DATE_PATTERN.test(fromParam)) {
    return NextResponse.json({ symbol, bars: [], error: "bad from date" }, { status: 400 });
  }
  const from = fromParam ?? new Date(Date.now() - TWO_YEARS_MS).toISOString().slice(0, 10);

  const tiingoKey = process.env.TIINGO_API_KEY;
  if (!tiingoKey) {
    return NextResponse.json(
      { symbol, bars: [], error: "missing TIINGO_API_KEY" },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const revalidate = secondsUntilNextClose(new Date());
  const history = await fetchTiingo(symbol, from, tiingoKey, revalidate);

  return NextResponse.json(history, {
    headers: {
      // Failures are retried soon; good answers last until the next close.
      "Cache-Control": history.error
        ? "no-store"
        : `public, s-maxage=${revalidate}, stale-while-revalidate=600`,
    },
  });
}
