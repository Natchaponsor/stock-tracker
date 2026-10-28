"use client";

import { useSyncExternalStore } from "react";

/**
 * A shared ticking clock, so "how long ago" readings keep counting while the
 * page sits open. It only re-renders; it never fetches anything. An external
 * store rather than state-in-an-effect: the server snapshot of 0 means "not
 * mounted yet", which keeps relative times off the server render and out of a
 * hydration mismatch.
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

/** Current time in ms, updated every 30s; null until mounted. */
export function useNow(): number | null {
  const tick = useSyncExternalStore(subscribeClock, getClock, getServerClock);
  return tick === 0 ? null : tick;
}
