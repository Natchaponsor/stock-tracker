"use client";

import { useEffect, useMemo } from "react";
import { useFxLatest } from "@/hooks/useFx";
import { useHydrated } from "@/hooks/useHydrated";
import { alertPairs, evaluateFxAlerts, type LatestRate } from "@/lib/fxAlerts";
import { uploadPushAlerts } from "@/lib/fxPushClient";
import { usePositionStore } from "@/store/usePositionStore";
import type { FxPair } from "@/lib/types";

const UPLOAD_DELAY_MS = 2_000;

/**
 * Runs the FX alert check when the app opens (one rates request for every
 * pair with an active alert), and keeps the push server's copy of the alerts
 * current when push is on. Renders nothing.
 */
export function FxAlertWatcher() {
  const hydrated = useHydrated();
  const fxAlerts = usePositionStore((s) => s.fxAlerts);
  const applyFxAlertTransitions = usePositionStore((s) => s.applyFxAlertTransitions);

  const pairsKey = alertPairs(fxAlerts).sort().join(",");
  const pairs = useMemo(() => (pairsKey ? (pairsKey.split(",") as FxPair[]) : []), [pairsKey]);
  const { rates } = useFxLatest(hydrated ? pairs : []);

  useEffect(() => {
    if (!rates) return;
    const latest = new Map<FxPair, LatestRate>(Object.entries(rates) as [FxPair, LatestRate][]);
    const transitions = evaluateFxAlerts(usePositionStore.getState().fxAlerts, latest);
    if (transitions.length > 0) applyFxAlertTransitions(transitions);
  }, [rates, applyFxAlertTransitions]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => void uploadPushAlerts(fxAlerts).catch(() => {}), UPLOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hydrated, fxAlerts]);

  return null;
}
