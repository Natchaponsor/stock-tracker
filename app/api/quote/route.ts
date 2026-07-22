import { NextRequest, NextResponse } from "next/server";
import type { Quote } from "@/lib/types";

const YAHOO_CHART_URL = (symbol: string) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

const REVALIDATE_SECONDS = 45;
const MAX_SYMBOLS = 25;

async function fetchQuote(symbol: string): Promise<Quote> {
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
      return { symbol, price: null, changePct: null, asOf: null, error: `upstream ${res.status}` };
    }

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") {
      return { symbol, price: null, changePct: null, asOf: null, error: "no data" };
    }

    const price = meta.regularMarketPrice;
    const prevClose = meta.previousClose ?? meta.chartPreviousClose;
    const changePct =
      typeof prevClose === "number" && prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : null;

    return {
      symbol,
      price,
      changePct,
      asOf: new Date().toISOString(),
    };
  } catch {
    return { symbol, price: null, changePct: null, asOf: null, error: "fetch failed" };
  }
}

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = Array.from(
    new Set(
      symbolsParam
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, MAX_SYMBOLS);

  if (symbols.length === 0) {
    return NextResponse.json([], { headers: { "Cache-Control": "public, max-age=0" } });
  }

  const quotes = await Promise.all(symbols.map(fetchQuote));

  return NextResponse.json(quotes, {
    headers: {
      "Cache-Control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=60`,
    },
  });
}
