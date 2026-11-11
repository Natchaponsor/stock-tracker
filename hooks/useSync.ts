"use client";

import { useSyncExternalStore } from "react";
import { getSyncEngine } from "@/lib/sync/client";
import type { SyncStatus } from "@/lib/sync/engine";

const SERVER_STATUS: SyncStatus = { state: "off", lastSyncedAt: null, pending: false, message: null };

const noopSubscribe = () => () => {};

/** Live sync status for the UI ("off" on the server and before mount). */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    typeof window === "undefined" ? noopSubscribe : (listener) => getSyncEngine().subscribe(listener),
    () => getSyncEngine().getStatus(),
    () => SERVER_STATUS
  );
}
