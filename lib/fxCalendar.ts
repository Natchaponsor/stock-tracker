import calendar from "@/data/central-banks.json";

export interface PolicyDecision {
  currency: string;
  bank: string;
  date: string; // YYYY-MM-DD
  source: string;
}

/**
 * The next policy-rate decision for each of `currencies` that has a central bank
 * in data/central-banks.json, soonest first. `today` is YYYY-MM-DD.
 */
export function nextDecisions(currencies: string[], today: string): PolicyDecision[] {
  const out: PolicyDecision[] = [];
  for (const bank of calendar.banks) {
    if (!currencies.includes(bank.currency)) continue;
    const date = bank.decisions.find((d) => d >= today);
    if (date) out.push({ currency: bank.currency, bank: bank.name, date, source: bank.source });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Whole days from `today` to `date`, both YYYY-MM-DD. */
export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}
