"use client";

import { SyncEngine } from "./engine";
import { getLocalDevice } from "./device";
import { selectSyncBook, usePositionStore } from "@/store/usePositionStore";

/**
 * The app's one sync engine, bound to the zustand store and localStorage, and
 * the listeners that drive it. Browser only.
 */

/** Store fields that travel with sync; a change to any of them schedules a push. */
const SYNCED_FIELDS = [
  "fxWatchlist",
  "fxWatchlistOrderUpdatedAt",
  "fxAlerts",
  "cashDeposits",
  "devices",
  "positions",
  "strategies",
  "watchlist",
  "customSectors",
  "startingCash",
  "startingCashUpdatedAt",
  "watchlistOrderUpdatedAt",
  "deletions",
] as const;

const PUSH_DELAY_MS = 2_000;
const PULL_EVERY_MS = 60_000;

let engine: SyncEngine | null = null;
/** True while the engine writes a merged book into the store, so that write isn't seen as a local edit. */
let applying = false;
let attached = false;

export function getSyncEngine(): SyncEngine {
  engine ??= new SyncEngine({
    book: {
      get: () => selectSyncBook(usePositionStore.getState()),
      apply: (book) => {
        applying = true;
        try {
          usePositionStore.getState().applySynced(book);
        } finally {
          applying = false;
        }
      },
    },
    storage: window.localStorage,
  });
  return engine;
}

/** Pull now if sync is on and the page is visible (also used by the Refresh button). */
export function syncSoon() {
  const e = getSyncEngine();
  if (e.isOn() && document.visibilityState === "visible") void e.sync();
}

/**
 * Starts syncing: local edits push ~2s after the last change, and the book
 * pulls on open, on return to the app, on reconnect and every minute. Call once,
 * after the store has loaded from storage (its hydration is not an edit).
 */
export function attachSync() {
  if (attached) return;
  attached = true;
  const e = getSyncEngine();

  let pushTimer: ReturnType<typeof setTimeout> | undefined;
  usePositionStore.subscribe((state, prev) => {
    if (applying || !e.isOn()) return;
    if (SYNCED_FIELDS.some((field) => state[field] !== prev[field])) {
      e.markChanged();
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => void e.sync(), PUSH_DELAY_MS);
    }
  });

  // Keep this device on the synced device list. touchDevice only changes the
  // book when the entry is missing, renamed or hours old, so this settles.
  e.subscribe(() => {
    if (e.getStatus().state === "synced") usePositionStore.getState().touchDevice(getLocalDevice());
  });

  document.addEventListener("visibilitychange", syncSoon);
  window.addEventListener("online", syncSoon);
  setInterval(syncSoon, PULL_EVERY_MS);
  syncSoon();
}
