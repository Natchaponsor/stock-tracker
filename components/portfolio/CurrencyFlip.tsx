"use client";

import { cn } from "@/lib/cn";
import { formatRate, formatRateDate } from "@/lib/fx";
import type { useDisplayCurrency } from "@/hooks/useDisplayCurrency";

type Display = ReturnType<typeof useDisplayCurrency>;

/**
 * USD | THB on the silk: flips the portfolio totals between dollars and the
 * home currency. A glass pill; the chosen side is the white one.
 */
export function CurrencyFlip({ display, className }: { display: Display; className?: string }) {
  const option = (code: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded-full px-2.5 py-0.5 text-[12px] leading-[18px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ns-on-primary",
        active ? "bg-ns-card text-ns-primary-text" : "text-ns-on-hero-muted hover:text-ns-on-primary"
      )}
    >
      {code}
    </button>
  );
  return (
    <div
      role="group"
      aria-label="Show totals in"
      className={cn("inline-flex items-center gap-0.5 rounded-full border border-ns-glass-line bg-ns-glass p-0.5", className)}
    >
      {option("USD", !display.wantsAlt, () => display.setChoice("USD"))}
      {option(display.alt, display.wantsAlt, () => display.setChoice("home"))}
    </div>
  );
}

/**
 * What rate the totals use, or why they are still in dollars. Null when showing
 * dollars. `short` fits a chip ("1 USD = 33.52 THB"); `full` adds the fix date.
 */
export function displayRateLine(display: Display): { short: string; full: string } | null {
  if (!display.wantsAlt) return null;
  if (display.fx) {
    const short = `1 USD = ${formatRate(display.fx.rate)} ${display.alt}`;
    return { short, full: `${short} · reference rate, ${formatRateDate(display.fx.date)}` };
  }
  const text = display.rateLoading
    ? `Getting the USD/${display.alt} rate…`
    : `No USD/${display.alt} rate right now · showing dollars`;
  return { short: text, full: text };
}
