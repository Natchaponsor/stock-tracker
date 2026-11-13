import { NextRequest, NextResponse } from "next/server";
import { makePair } from "@/lib/fx";
import { fetchLatest, FX_REVALIDATE_SECONDS } from "@/lib/server/frankfurter";
import type { FxPair } from "@/lib/types";

// GET /api/fx/latest?pairs=USD/THB,EUR/THB → { rates: { "USD/THB": { rate, date } } }
// One upstream request per base currency.

const MAX_PAIRS = 40;

export async function GET(request: NextRequest) {
  const pairs = Array.from(
    new Set(
      (request.nextUrl.searchParams.get("pairs") ?? "")
        .split(",")
        .map((p) => makePair(...(p.split("/") as [string, string])))
        .filter((p): p is FxPair => p !== null)
    )
  ).slice(0, MAX_PAIRS);
  if (pairs.length === 0) return NextResponse.json({ rates: {}, error: "no pairs" }, { status: 400 });

  try {
    const latest = await fetchLatest(pairs);
    return NextResponse.json(
      { rates: Object.fromEntries(latest) },
      { headers: { "Cache-Control": `public, s-maxage=${FX_REVALIDATE_SECONDS}, stale-while-revalidate=600` } }
    );
  } catch (err) {
    return NextResponse.json(
      { rates: {}, error: err instanceof Error ? err.message : "fetch failed" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
