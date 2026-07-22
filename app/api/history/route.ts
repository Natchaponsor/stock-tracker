import { NextRequest, NextResponse } from "next/server";
import type { DailyBar } from "@/lib/types";

const YAHOO_CHART_URL = (symbol: string) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2y`;

const REVALIDATE_SECONDS = 60 * 60; // daily bars are stable within a day

interface HistoryResponse {
  symbol: string;
  bars: DailyBar[];
  error?: string;
}

async function fetchHistory(symbol: string): Promise<HistoryResponse> {
  try {
    const res = await fetch(YAHOO_CHART_URL(symbol), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "application/json",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      return { symbol, bars: [], error: `upstream ${res.status}` };
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const timestamps: number[] | undefined = result?.timestamp;
    const closes: (number | null)[] | undefined = result?.indicators?.quote?.[0]?.close;

    if (!timestamps || !closes) {
      return { symbol, bars: [], error: "no data" };
    }

    const bars: DailyBar[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (typeof close !== "number") continue;
      const date = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
      bars.push({ date, close });
    }

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

  const history = await fetchHistory(symbol);

  return NextResponse.json(history, {
    headers: {
      "Cache-Control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=120`,
    },
  });
}
