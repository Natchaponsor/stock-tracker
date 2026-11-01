import { NextRequest } from "next/server";
import { isAllowedLogoUrl, isLogoSymbol } from "@/lib/logo";

/**
 * Company logo proxy: looks up a ticker's logo through Finnhub's free company
 * profile, then serves the image from this app's own origin. The browser never
 * talks to Finnhub, so no third party learns which symbols are on someone's
 * sheet. Any miss (unknown ticker, non-US listing, no key, upstream down) is a
 * 404/502 and the UI falls back to the lettered circle.
 */

const PROFILE_URL = (symbol: string, apiKey: string) =>
  `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;

// Logos almost never change, so each one is looked up about once a month.
const MONTH_SECONDS = 60 * 60 * 24 * 30;
const DAY_SECONDS = 60 * 60 * 24;

const noStore = { "Cache-Control": "no-store" };

/** A confirmed "no logo" is cached for a day so the same miss isn't re-asked on every render. */
function noLogo() {
  return new Response(null, { status: 404, headers: { "Cache-Control": `public, s-maxage=${DAY_SECONDS}` } });
}

export async function GET(request: NextRequest) {
  const symbol = (request.nextUrl.searchParams.get("symbol") ?? "").trim().toUpperCase();
  if (!isLogoSymbol(symbol)) return new Response(null, { status: 400, headers: noStore });

  const apiKey = process.env.FINNHUB_API_KEY;
  // Misconfiguration, not a fact about the symbol, so it must not be cached.
  if (!apiKey) return new Response(null, { status: 404, headers: noStore });

  try {
    const profileRes = await fetch(PROFILE_URL(symbol, apiKey), { next: { revalidate: MONTH_SECONDS } });
    if (!profileRes.ok) return new Response(null, { status: 502, headers: noStore });

    const profile: unknown = await profileRes.json();
    const logoUrl =
      typeof profile === "object" && profile !== null && typeof (profile as { logo?: unknown }).logo === "string"
        ? (profile as { logo: string }).logo
        : "";
    if (!logoUrl || !isAllowedLogoUrl(logoUrl)) return noLogo();

    const imageRes = await fetch(logoUrl, { next: { revalidate: MONTH_SECONDS } });
    const contentType = imageRes.headers.get("content-type") ?? "";
    if (!imageRes.ok || !contentType.startsWith("image/")) return noLogo();

    return new Response(await imageRes.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": `public, max-age=${DAY_SECONDS}, s-maxage=${MONTH_SECONDS}, stale-while-revalidate=${DAY_SECONDS}`,
      },
    });
  } catch {
    return new Response(null, { status: 502, headers: noStore });
  }
}
