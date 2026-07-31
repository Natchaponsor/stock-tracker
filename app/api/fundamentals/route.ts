import { NextRequest, NextResponse } from "next/server";
import type { Fundamentals } from "@/lib/types";

const MAX_SYMBOLS = 25;

/**
 * P/E ratio is fundamental/company data, not a price quote or candle — a
 * different data category from /api/quote and /api/history, so it likely
 * needs its own provider. None is wired up yet (see README's "Coming Soon"
 * section for candidates under discussion). Once one is picked, replace this
 * body with a real fetch shaped like fetchQuote in ../quote/route.ts — every
 * consumer (useFundamentals, SignalsPanel) already expects this exact
 * response shape, so that's the only change needed.
 */
async function fetchFundamentals(symbol: string): Promise<Fundamentals> {
  return { symbol, peRatio: null, asOf: null, error: "no fundamentals provider configured yet" };
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

  const fundamentals = await Promise.all(symbols.map((s) => fetchFundamentals(s)));

  return NextResponse.json(fundamentals, { headers: { "Cache-Control": "no-store" } });
}
