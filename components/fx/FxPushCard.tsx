"use client";

import { useState, useSyncExternalStore } from "react";
import { BellRing } from "lucide-react";
import { NsCard } from "@/components/navy/primitives";
import { Button } from "@/components/ui/Button";
import { disablePush, enablePush, getPushState, subscribePushState, type PushState } from "@/lib/fxPushClient";
import { usePositionStore } from "@/store/usePositionStore";

export function usePushState(): PushState {
  return useSyncExternalStore(subscribePushState, getPushState, () => "unknown" as const);
}

const STATUS: Record<PushState, string> = {
  unknown: "",
  unsupported: "This browser can't receive push notifications.",
  "needs-install":
    "On iPhone and iPad, push works once the app is on your Home Screen: tap Share, then Add to Home Screen, and open it from there.",
  unconfigured: "Push isn't set up on this server yet (it needs VAPID keys).",
  denied: "Notifications are blocked for this site. Allow them in your browser settings, then come back.",
  off: "Off. Alerts are checked when you open the app.",
  on: "On for this device. Alerts are also checked once a day while the app is closed.",
};

/**
 * Opt-in push for FX alerts. Turning it on shares only the pairs and levels of
 * your alerts with the server, never amounts, notes or the book; the copy says so.
 */
export function FxPushCard() {
  const state = usePushState();
  const fxAlerts = usePositionStore((s) => s.fxAlerts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (state === "on") await disablePush();
      else await enablePush(fxAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const canToggle = state === "on" || state === "off";

  return (
    <div id="push" className="scroll-mt-6">
      <NsCard title="Alerts when the app is closed" meta="Push notifications · this device only">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ns-primary-soft text-ns-primary-text"
          >
            <BellRing className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 space-y-2">
            <p className="ns-body text-ns-ink">{STATUS[state]}</p>
            <p className="ns-caption text-ns-ink-muted">
              To alert you while the app is closed, the server keeps the pair and level of each alert. Nothing else:
              no amounts, notes or positions, and no link to your sync code. Turning push off deletes it.
            </p>
            {error && (
              <p role="alert" className="ns-caption text-ns-danger">
                {error}
              </p>
            )}
            {canToggle && (
              <Button variant={state === "on" ? "secondary" : "primary"} size="sm" onClick={toggle} disabled={busy}>
                {busy ? "Working…" : state === "on" ? "Turn off push" : "Turn on push"}
              </Button>
            )}
          </div>
        </div>
      </NsCard>
    </div>
  );
}
