import type { Quote } from "@/lib/types";

/**
 * A token identifying the current fix. Figures key on it so that when a new
 * fix lands they re-stamp — the signature interaction — rather than silently
 * swapping their digits.
 *
 * ISO-8601 UTC strings sort lexicographically, so a string compare is enough
 * here and avoids parsing a date per quote on every render.
 */
export function latestFixToken(quotes: Map<string, Quote>): string {
  let newest = "";
  for (const quote of quotes.values()) {
    if (quote.asOf && quote.asOf > newest) newest = quote.asOf;
  }
  return newest;
}
