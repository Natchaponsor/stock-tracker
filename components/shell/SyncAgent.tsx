"use client";

import { useEffect } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { useSyncDialog } from "@/hooks/useSyncDialog";
import { attachSync } from "@/lib/sync/client";
import { normalizeSyncCode } from "@/lib/sync/crypto";

/**
 * Starts device sync once the stored book has loaded, and opens the pairing
 * form when the page was opened from a scanned pairing link (`/#pair=CODE`).
 * Renders nothing.
 */
export function SyncAgent() {
  const hydrated = useHydrated();
  const show = useSyncDialog((s) => s.show);

  useEffect(() => {
    if (!hydrated) return;
    attachSync();
    const openPairLink = () => {
      const match = /^#pair=([A-Za-z0-9-]+)$/.exec(window.location.hash);
      if (!match) return;
      // Take the code out of the address bar so it isn't left in history or shared by accident.
      history.replaceState(history.state, "", window.location.pathname + window.location.search);
      show(normalizeSyncCode(match[1]));
    };
    openPairLink();
    // A link opened in a tab already showing the app only changes the hash; it doesn't reload.
    window.addEventListener("hashchange", openPairLink);
    return () => window.removeEventListener("hashchange", openPairLink);
  }, [hydrated, show]);

  return null;
}
