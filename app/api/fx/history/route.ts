import { NextRequest, NextResponse } from "next/server";
import { makePair } from "@/lib/fx";
import { fetchSeries, FrankfurterError, FX_REVALIDATE_SECONDS } from "@/lib/server/frankfurter";
import type { FxBar } from "@/lib/types";

// GET /api/fx/history?pair=USD/THB&days=365[&provider=BOT]
// → { pair, provider, bars: [{ date, rate }] } — daily reference rates, oldest first.

const MAX_DAYS = 3660; // 10 years
const PROVIDER_RE = /^[A-Z]{2,8}$/;

interface HistoryResponse {
  pair: string;
  provider: string | null;
  bars: FxBar[];
  error?: string;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const pair = makePair(...((params.get("pair") ?? "").split("/") as [string, string]));
  const days = Math.min(MAX_DAYS, Math.max(7, Number(params.get("days")) || 365));
  const providerParam = params.get("provider")?.toUpperCase() ?? null;
  const provider = providerParam && PROVIDER_RE.test(providerParam) ? providerParam : null;

  if (!pair) {
    return NextResponse.json({ pair: "", provider, bars: [], error: "invalid pair" } satisfies HistoryResponse, { status: 400 });
  }

  const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  try {
    const bars = await fetchSeries(pair, from, provider ?? undefined);
    return NextResponse.json({ pair, provider, bars } satisfies HistoryResponse, {
      headers: { "Cache-Control": `public, s-maxage=${FX_REVALIDATE_SECONDS}, stale-while-revalidate=600` },
    });
  } catch (err) {
    const status = err instanceof FrankfurterError && err.status === 422 ? 400 : 502;
    const error = err instanceof Error ? err.message : "fetch failed";
    return NextResponse.json({ pair, provider, bars: [], error } satisfies HistoryResponse, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
