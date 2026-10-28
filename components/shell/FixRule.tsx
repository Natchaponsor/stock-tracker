"use client";

import { useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useQuotes } from "@/hooks/useQuotes";
import { usePositionStore } from "@/store/usePositionStore";
import { RefreshPriceButton } from "./RefreshPriceButton";
import { cn } from "@/lib/cn";
import { formatAgo, formatAsOf } from "@/lib/priceTime";
import { useNow } from "@/components/log/clock";

const NO_EXTRA_SYMBOLS: string[] = [];

/**
 * The price-age bar ("fix rule" internally): how old the prices are, stated
 * before the prices themselves, in plain words — "Prices as of 10:17 AM · 1 min
 * ago". The time is the market price's own timestamp, not when the app last
 * fetched, so a weekend refresh still honestly reads "as of Fri 4:00 PM".
 *
 * The lamp only burns when there is an actual fix to report — with nothing
 * logged, or with the upstream quote unavailable, the band goes quiet rather
 * than implying currency it does not have.
 */
export function FixRule() {
  const { quotes, isLoading, hasError } = useQuotes(NO_EXTRA_SYMBOLS);
  const hidePnl = usePositionStore((s) => s.hidePnl);
  const toggleHidePnl = usePositionStore((s) => s.toggleHidePnl);

  const latest = useMemo(() => {
    let newest: number | null = null;
    for (const quote of quotes.values()) {
      if (quote.price === null || !quote.asOf) continue;
      const t = new Date(quote.asOf).getTime();
      if (Number.isFinite(t) && (newest === null || t > newest)) newest = t;
    }
    return newest;
  }, [quotes]);

  // null until mounted, so the age never renders on the server.
  const now = useNow();

  const tracked = quotes.size;
  const hasFix = latest !== null;
  const lamp = hasFix;

  let reading: string;
  // Phones get a shorter line ("As of …") so the time and age still fit
  // beside the buttons; the full "Prices as of …" needs the wider bar.
  let shortReading: string | null = null;
  if (hasFix) {
    const asOf = formatAsOf(new Date(latest), now === null ? null : new Date(now));
    const age = now === null ? "" : ` · ${formatAgo(now - latest)}`;
    reading = `Prices as of ${asOf}${age}`;
    shortReading = `As of ${asOf}${age}`;
  } else if (hasError) {
    reading = "Prices unavailable";
  } else if (isLoading && tracked === 0) {
    reading = "Loading prices…";
  } else if (tracked === 0) {
    reading = "No stocks to price yet";
  } else {
    reading = "Waiting for prices";
  }

  return (
    <div
      className={cn(
        "border-b",
        lamp ? "border-accent-strong bg-accent text-on-accent" : "border-rule-strong bg-panel text-fg-muted"
      )}
    >
      <div className="mx-auto flex h-10 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
        {/* The now-marker: it sits hard left on a fresh fix and travels right
            as that fix ages out across a week, so the rule reads as a scale
            rather than a label. Taking a fix walks it back to the start. */}
        {lamp && now !== null ? (
          <span
            aria-hidden="true"
            className="relative hidden h-3 shrink-0 sm:block sm:w-20"
          >
            <span className="absolute inset-x-0 top-1/2 border-t border-current opacity-40" />
            <span
              className="absolute top-0 h-3 w-[3px] bg-current"
              style={{ left: `calc(${Math.min(1, (now - latest) / (7 * 24 * 60 * 60_000)) * 100}% - 1.5px)` }}
            />
          </span>
        ) : (
          <span aria-hidden="true" className={cn("h-3 w-[3px] shrink-0", lamp ? "bg-on-accent" : "bg-fg-subtle")} />
        )}

        <p
          key={latest ?? "no-fix"}
          className={cn("fix-stamp animate-fix-stamp truncate text-[11px] uppercase tracking-[0.12em]", lamp && "font-medium")}
          title={hasFix ? new Date(latest).toLocaleString() : undefined}
        >
          {shortReading === null ? (
            reading
          ) : (
            <>
              <span className="sm:hidden">{shortReading}</span>
              <span className="hidden sm:inline">{reading}</span>
            </>
          )}
        </p>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={toggleHidePnl}
            aria-pressed={hidePnl}
            title="Hide P&L (privacy mode)"
            className={cn(
              "flex h-7 w-7 items-center justify-center border transition-colors",
              // The global focus ring is the accent; on the accent band that is a
              // 1:1 contrast ratio, so the ring switches to the band's ink.
              lamp
                ? "border-on-accent/30 text-on-accent hover:border-on-accent focus-visible:outline-on-accent"
                : "border-rule-strong text-fg-muted hover:text-fg"
            )}
          >
            {hidePnl ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span className="sr-only">{hidePnl ? "Show P&L" : "Hide P&L"}</span>
          </button>
          <RefreshPriceButton onAccent={lamp} />
        </div>
      </div>
    </div>
  );
}
