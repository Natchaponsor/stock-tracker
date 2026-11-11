"use client";

import { useEffect, useState } from "react";
import { listenForInstall } from "@/hooks/useInstallApp";
import { cn } from "@/lib/cn";

type Notice = { kind: "update"; worker: ServiceWorker } | { kind: "offline-ready" } | null;

/**
 * Registers /sw.js (production only: in development it would cache stale
 * chunks under hot reload) and shows its two notices as a small toast:
 * "Ready to work offline" the first time, and "A new version is available"
 * when a deploy ships a new worker. Reload hands over to the new worker.
 */
export function ServiceWorker() {
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    listenForInstall();
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        // An update that finished installing while the app was closed.
        if (registration.waiting && navigator.serviceWorker.controller) {
          setNotice({ kind: "update", worker: registration.waiting });
        }
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state !== "installed") return;
            // With a controller already in charge this is an update; without one it's the first install.
            setNotice(navigator.serviceWorker.controller ? { kind: "update", worker } : { kind: "offline-ready" });
          });
        });
      })
      .catch(() => {
        // No worker (private mode, blocked): the app simply runs online-only.
      });

    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  useEffect(() => {
    if (notice?.kind !== "offline-ready") return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;

  return (
    <div
      role="status"
      // Clears the phone tab bar; sits in the corner on the web.
      className={cn(
        "fixed inset-x-3 bottom-[calc(108px+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm items-center gap-3 rounded-ns-lg bg-ns-card px-4 py-3 shadow-ns-card",
        "md:inset-x-auto md:right-6 md:bottom-6 md:mx-0"
      )}
    >
      <p className="ns-label min-w-0 flex-1 text-ns-ink">
        {notice.kind === "update" ? "A new version is available" : "Ready to work offline"}
      </p>
      {notice.kind === "update" ? (
        <>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ns-label cursor-pointer rounded-full px-2 py-1.5 text-ns-ink-muted hover:text-ns-ink"
          >
            Later
          </button>
          <button
            type="button"
            onClick={() => notice.worker.postMessage("SKIP_WAITING")}
            className="oc-btn oc-btn-primary px-4! py-2! text-[13px]!"
          >
            Reload
          </button>
        </>
      ) : null}
    </div>
  );
}
