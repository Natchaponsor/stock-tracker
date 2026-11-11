"use client";

import { create } from "zustand";

/**
 * Open/closed state for the Sync devices dialog, shared so both the Data menu
 * and a `#pair=` link (scanned with the phone camera) can open it.
 */
interface SyncDialogState {
  open: boolean;
  /** A code to pair with, from a scanned link. */
  prefillCode: string | null;
  show: (prefillCode?: string | null) => void;
  hide: () => void;
}

export const useSyncDialog = create<SyncDialogState>()((set) => ({
  open: false,
  prefillCode: null,
  show: (prefillCode = null) => set({ open: true, prefillCode }),
  hide: () => set({ open: false, prefillCode: null }),
}));
