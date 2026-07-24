import { NextRequest, NextResponse } from "next/server";
import type { Quote } from "@/lib/types";

const FINNHUB_QUOTE_URL = (symbol: string, apiKey: string) =>
  `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;

const REVALIDATE_SECONDS = 45;
const MAX_SYMBOLS = 25;

interface FinnhubQuote {
  c: number; // current price
  d: number | null; // change
  dp: number | null; // percent change
  pc: number; // previous close
  t: number; // timestamp
}

async function fetchQuote(symbol: string, apiKey: string): Promise<Quote> {
  try {
    const res = await fetch(FINNHUB_QUOTE_URL(symbol, apiKey), {
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      return { symbol, price: null, changePct: null, asOf: null, error: `upstream ${res.status}` };
    }

    const data: FinnhubQuote = await res.json();

    // Finnhub returns 200 with all-zero fields for an unknown symbol rather than an error status.
    if (typeof data.c !== "number" || (data.c === 0 && data.pc === 0)) {
      return { symbol, price: null, changePct: null, asOf: null, error: "no data" };
    }

    return {
      symbol,
      price: data.c,
      changePct: typeof data.dp === "number" ? data.dp : null,
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

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    const quotes: Quote[] = symbols.map((symbol) => ({
      symbol,
      price: null,
      changePct: null,
      asOf: null,
      error: "missing FINNHUB_API_KEY",
    }));
    return NextResponse.json(quotes, { headers: { "Cache-Control": "no-store" } });
  }

  const quotes = await Promise.all(symbols.map((s) => fetchQuote(s, apiKey)));

  return NextResponse.json(quotes, {
    headers: {
      "Cache-Control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=60`,
    },
  });
}
