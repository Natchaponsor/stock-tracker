import { NextRequest, NextResponse } from "next/server";
import type { DailyBar } from "@/lib/types";

const FINNHUB_CANDLE_URL = (symbol: string, from: number, to: number, apiKey: string) =>
  `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${apiKey}`;

const REVALIDATE_SECONDS = 60 * 60; // daily bars are stable within a day
const TWO_YEARS_SECONDS = 60 * 60 * 24 * 365 * 2;

interface HistoryResponse {
  symbol: string;
  bars: DailyBar[];
  error?: string;
}

interface FinnhubCandles {
  s: "ok" | "no_data";
  t?: number[];
  c?: number[];
}

async function fetchHistory(symbol: string, apiKey: string): Promise<HistoryResponse> {
  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - TWO_YEARS_SECONDS;

    const res = await fetch(FINNHUB_CANDLE_URL(symbol, from, to, apiKey), {
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      return { symbol, bars: [], error: `upstream ${res.status}` };
    }

    const data: FinnhubCandles = await res.json();

    if (data.s !== "ok" || !Array.isArray(data.t) || !Array.isArray(data.c)) {
      return { symbol, bars: [], error: "no data" };
    }

    const bars: DailyBar[] = data.t.map((timestamp, i) => ({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      close: data.c![i],
    }));

    return { symbol, bars };
  } catch {
    return { symbol, bars: [], error: "fetch failed" };
  }
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();

  if (!symbol) {
    return NextResponse.json({ symbol: "", bars: [], error: "missing symbol" }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { symbol, bars: [], error: "missing FINNHUB_API_KEY" },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const history = await fetchHistory(symbol, apiKey);

  return NextResponse.json(history, {
    headers: {
      "Cache-Control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=120`,
    },
  });
}
