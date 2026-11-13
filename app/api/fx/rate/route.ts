import { NextRequest, NextResponse } from "next/server";
import { makePair } from "@/lib/fx";
import { fetchRateOn, FrankfurterError, FX_REVALIDATE_SECONDS } from "@/lib/server/frankfurter";

// GET /api/fx/rate?pair=USD/THB&date=2026-11-08
// → { pair, date, rate } — the daily reference fix on that day, or the last one
// before it (weekends, holidays). `date` in the reply is the fix actually used.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EARLIEST = "1999-01-04"; // the first euro reference rates

interface RateResponse {
  pair: string;
  date: string | null;
  rate: number | null;
  error?: string;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const pair = makePair(...((params.get("pair") ?? "").split("/") as [string, string]));
  const date = params.get("date") ?? "";
  const today = new Date().toISOString().slice(0, 10);

  if (!pair || !DATE_RE.test(date) || Number.isNaN(Date.parse(date)) || date < EARLIEST) {
    return NextResponse.json({ pair: pair ?? "", date: null, rate: null, error: "invalid pair or date" } satisfies RateResponse, {
      status: 400,
    });
  }
  // A date ahead of the server's UTC day (a user east of UTC after midnight) asks for today's fix.
  const asked = date > today ? today : date;

  try {
    const fix = await fetchRateOn(pair, asked);
    if (!fix) {
      return NextResponse.json({ pair, date: null, rate: null, error: "no rate for that date" } satisfies RateResponse, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }
    // A past day's fix never changes; today's may still be published.
    const maxAge = asked < today ? 60 * 60 * 24 * 7 : FX_REVALIDATE_SECONDS;
    return NextResponse.json({ pair, date: fix.date, rate: fix.rate } satisfies RateResponse, {
      headers: { "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=600` },
    });
  } catch (err) {
    const status = err instanceof FrankfurterError && err.status === 422 ? 400 : 502;
    return NextResponse.json(
      { pair, date: null, rate: null, error: err instanceof Error ? err.message : "fetch failed" } satisfies RateResponse,
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
