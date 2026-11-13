import { NextRequest, NextResponse } from "next/server";
import { FX_CODES } from "@/lib/fx";
import type { FxNewsItem } from "@/lib/types";

// GET /api/fx/news?currencies=USD,THB → { items: [{ headline, source, url, datetime, currency }] }
//
// Finnhub's forex and general market news, which aren't tagged by currency, so
// headlines are matched by keyword. The forex feed alone is often near empty. Headlines about a non-USD currency come first: dollar stories are
// everywhere, baht stories are rare.

const FINNHUB_NEWS_URL = (category: string, apiKey: string) =>
  `https://finnhub.io/api/v1/news?category=${category}&token=${apiKey}`;
const CATEGORIES = ["forex", "general"];
const REVALIDATE_SECONDS = 60 * 30;
const MAX_ITEMS = 6;

const KEYWORDS: Record<string, RegExp> = {
  USD: /\b(dollar|USD|Fed|FOMC|Federal Reserve)\b/i,
  THB: /\b(baht|THB|Thai|Thailand|Bank of Thailand|BoT)\b/,
  EUR: /\b(euro|EUR|ECB|eurozone|euro area)\b/i,
  JPY: /\b(yen|JPY|BoJ|BOJ|Bank of Japan|Japan)\b/,
  GBP: /\b(sterling|pound|GBP|BoE|BOE|Bank of England)\b/,
  CNY: /\b(yuan|renminbi|CNY|CNH|PBOC|PBoC|China)\b/,
  SGD: /\b(Singapore|SGD|MAS)\b/,
  HKD: /\b(Hong Kong|HKD|HKMA)\b/,
  AUD: /\b(Aussie|AUD|RBA|Australia)\b/,
  CAD: /\b(loonie|CAD|Bank of Canada|BoC|Canada)\b/,
  CHF: /\b(franc|CHF|SNB|Swiss)\b/,
  KRW: /\b(won|KRW|Bank of Korea|Korea)\b/,
  MYR: /\b(ringgit|MYR|Malaysia|Bank Negara)\b/,
  TWD: /\b(Taiwan|TWD)\b/,
  INR: /\b(rupee|INR|RBI|India)\b/,
  IDR: /\b(rupiah|IDR|Bank Indonesia|Indonesia)\b/,
  VND: /\b(dong|VND|Vietnam)\b/,
  PHP: /\b(peso|PHP|BSP|Philippine)\b/,
  NZD: /\b(kiwi|NZD|RBNZ|New Zealand)\b/,
};

interface FinnhubNews {
  datetime: number;
  headline: string;
  source: string;
  url: string;
}

export async function GET(request: NextRequest) {
  const currencies = (request.nextUrl.searchParams.get("currencies") ?? "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => FX_CODES.includes(c));
  if (currencies.length === 0) {
    return NextResponse.json({ items: [], error: "no currencies" }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ items: [], error: "missing FINNHUB_API_KEY" }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const feeds = await Promise.all(
      CATEGORIES.map(async (category) => {
        const res = await fetch(FINNHUB_NEWS_URL(category, apiKey), {
          headers: { Accept: "application/json" },
          next: { revalidate: REVALIDATE_SECONDS },
        });
        const body = res.ok ? ((await res.json()) as unknown) : null;
        return Array.isArray(body) ? (body as FinnhubNews[]) : null;
      })
    );
    if (feeds.every((f) => f === null)) {
      return NextResponse.json({ items: [], error: "upstream error" }, { status: 502 });
    }
    const news = feeds
      .flatMap((f) => f ?? [])
      .filter((n) => typeof n.headline === "string" && typeof n.url === "string")
      .sort((a, b) => b.datetime - a.datetime);

    // Non-USD currencies first, so a THB story beats the tenth dollar story.
    const order = [...currencies].sort((a, b) => Number(a === "USD") - Number(b === "USD"));
    const items: FxNewsItem[] = [];
    const seen = new Set<string>();
    for (const currency of order) {
      for (const n of news) {
        if (items.length >= MAX_ITEMS) break;
        if (seen.has(n.url) || !KEYWORDS[currency]?.test(n.headline)) continue;
        seen.add(n.url);
        items.push({
          headline: n.headline,
          source: n.source,
          url: n.url,
          datetime: new Date(n.datetime * 1000).toISOString(),
          currency,
        });
      }
    }
    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=300` } }
    );
  } catch {
    return NextResponse.json({ items: [], error: "fetch failed" }, { status: 502 });
  }
}
