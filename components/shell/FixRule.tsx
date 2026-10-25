"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useQuotes } from "@/hooks/useQuotes";
import { usePositionStore } from "@/store/usePositionStore";
import { RefreshPriceButton } from "./RefreshPriceButton";
import { cn } from "@/lib/cn";

const NO_EXTRA_SYMBOLS: string[] = [];

/**
 * How old the fix is, read the way a watch log reads it. Presentation only —
 * a quote that is eleven days stale says so in days, not in 268 hours.
 */
function formatAge(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ago`;
}

/**
 * A shared ticking clock, so the fix's age keeps counting while the page sits
 * open. An external store rather than state-in-an-effect: the server snapshot
 * of 0 means "not mounted yet", which keeps the age off the server render and
 * out of a hydration mismatch.
 */
let clockValue = 0;
let clockTimer: ReturnType<typeof setInterval> | null = null;
const clockListeners = new Set<() => void>();

function subscribeClock(onChange: () => void) {
  clockListeners.add(onChange);
  clockValue = Date.now();
  if (clockTimer === null) {
    clockTimer = setInterval(() => {
      clockValue = Date.now();
      clockListeners.forEach((listener) => listener());
    }, 30_000);
  }
  return () => {
    clockListeners.delete(onChange);
    if (clockListeners.size === 0 && clockTimer !== null) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

const getClock = () => clockValue;
const getServerClock = () => 0;

/**
 * The fix rule: how old the numbers are, stated before the numbers themselves.
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

  // 0 until mounted, so the age never renders on the server.
  const tick = useSyncExternalStore(subscribeClock, getClock, getServerClock);
  const now = tick === 0 ? null : tick;

  const tracked = quotes.size;
  const hasFix = latest !== null;
  const lamp = hasFix;

  let reading: string;
  if (hasFix) {
    const taken = new Date(latest);
    const sameDay = now !== null && new Date(now).toDateString() === taken.toDateString();
    const clock = taken.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    // A clock time alone would imply today; an older fix names its date.
    const stamp = sameDay
      ? clock
      : `${taken.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${clock}`;
    const age = now === null ? null : formatAge(now - latest);
    // Age leads: on a narrow viewport the timestamp truncates away, and how
    // stale the number is matters more than exactly when it was taken.
    reading = age === null ? `Last fix ${stamp}` : `Fix ${age} · ${stamp}`;
  } else if (hasError) {
    reading = "No fix — prices unavailable";
  } else if (isLoading && tracked === 0) {
    reading = "Taking first fix…";
  } else if (tracked === 0) {
    reading = "Nothing logged to fix";
  } else {
    reading = "Awaiting first fix";
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
            className="relative block h-3 w-10 shrink-0 sm:w-20"
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
          {reading}
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
