"use client";

import { create } from "zustand";

/**
 * Open/closed state for the Sync devices dialog, shared so both Settings and a
 * `#pair=` link (scanned with the phone camera) can open it.
 */
interface SyncDialogState {
  open: boolean;
  /** A code to pair with, from a scanned link. */
  prefillCode: string | null;
  /** Open straight on the "I have a code" form. */
  startOnPair: boolean;
  show: (prefillCode?: string | null, opts?: { pair?: boolean }) => void;
  hide: () => void;
}

export const useSyncDialog = create<SyncDialogState>()((set) => ({
  open: false,
  prefillCode: null,
  startOnPair: false,
  show: (prefillCode = null, opts = {}) => set({ open: true, prefillCode, startOnPair: Boolean(opts.pair) }),
  hide: () => set({ open: false, prefillCode: null, startOnPair: false }),
}));
