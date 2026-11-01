/**
 * Tickers the logo route will look up: uppercase letters and digits, plus the
 * dot and dash of class shares (BRK.B, BF-B), up to 10 characters.
 */
export function isLogoSymbol(symbol: string): boolean {
  return /^[A-Z0-9][A-Z0-9.-]{0,9}$/.test(symbol);
}

/**
 * The logo URL comes back inside Finnhub's response, so it is only followed when
 * it points at Finnhub's own HTTPS hosts. Anything else is treated as "no logo"
 * rather than letting an upstream reply steer the server to an arbitrary URL.
 */
export function isAllowedLogoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "finnhub.io" || u.hostname.endsWith(".finnhub.io"));
  } catch {
    return false;
  }
}

/** Where the app's own logo route serves a symbol's logo. */
export function logoSrc(symbol: string): string {
  return `/api/logo?symbol=${encodeURIComponent(symbol)}`;
}
