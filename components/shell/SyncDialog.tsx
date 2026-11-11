"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Copy, Eye, EyeOff, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { QrCode } from "@/components/shell/QrCode";
import { QrScanner } from "@/components/shell/QrScanner";
import { fieldClass } from "@/components/form/FormField";
import { useSyncDialog } from "@/hooks/useSyncDialog";
import { useSyncStatus } from "@/hooks/useSync";
import { getSyncEngine } from "@/lib/sync/client";
import { normalizeSyncCode } from "@/lib/sync/crypto";
import type { PairMode, SyncStatus } from "@/lib/sync/engine";
import { formatAgo } from "@/lib/priceTime";
import { useNow } from "@/components/log/clock";
import { cn } from "@/lib/cn";

/** Pulls a sync code out of a scanned link (`…/#pair=CODE`) or plain typed text. */
function codeFromScan(text: string): string | null {
  const match = /#pair=([A-Za-z0-9-]+)/.exec(text);
  return normalizeSyncCode(match ? match[1] : text);
}

/** "Synced 2 min ago", "Waiting to sync", … for the dialog and the Data menu. */
export function describeSync(status: SyncStatus, now: number | null): string {
  switch (status.state) {
    case "off":
      return "Sync is off";
    case "syncing":
      return "Syncing…";
    case "offline":
      return "Offline · changes will sync when you're back online";
    case "removed":
      return "The synced copy was deleted";
    case "unavailable":
      return "Sync isn't set up on this server";
    case "error":
      return status.message ?? "Sync failed";
    case "synced":
      if (status.pending) return "Waiting to sync your latest change";
      if (!status.lastSyncedAt || now === null) return "Synced";
      return `Synced ${formatAgo(now - new Date(status.lastSyncedAt).getTime())}`;
  }
}

type View = "intro" | "pair";

/**
 * Sync devices: turn sync on (shows the QR and code to pair other devices),
 * pair this device with a code (typed or scanned in-app), and manage it.
 * The panel mounts fresh on every open, so it always starts from a clean state.
 */
export function SyncDialog() {
  const { open, prefillCode, hide } = useSyncDialog();
  return <AnimatePresence>{open && <SyncPanel key="sync" prefillCode={prefillCode} onClose={hide} />}</AnimatePresence>;
}

function SyncPanel({ prefillCode, onClose }: { prefillCode: string | null; onClose: () => void }) {
  const hide = onClose;
  const status = useSyncStatus();
  const now = useNow();
  // A scanned `#pair=` link opens straight onto the pairing form.
  const [view, setView] = useState<View>(prefillCode ? "pair" : "intro");
  const [codeInput, setCodeInput] = useState(prefillCode ?? "");
  const [mode, setMode] = useState<PairMode>("replace");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOn = status.state !== "off";
  const code = typeof window === "undefined" ? null : getSyncEngine().getCode();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hide]);

  const onScan = useCallback((text: string) => {
    setScanning(false);
    const scanned = codeFromScan(text);
    if (scanned) setCodeInput(scanned);
    else setError("That QR code isn't a Stock Tracker sync code.");
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const engine = typeof window === "undefined" ? null : getSyncEngine();
  const pairLink = code ? `${window.location.origin}/#pair=${code}` : "";

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={hide}
        className="fixed inset-0 z-50 bg-ns-ocean-900/50"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-dialog-title"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ type: "spring", stiffness: 400, damping: 34 }}
        className="fixed inset-x-3 top-[max(1rem,6vh)] bottom-4 z-50 mx-auto flex max-w-md flex-col overflow-hidden rounded-ns-lg bg-ns-card shadow-ns-card sm:bottom-auto sm:max-h-[88vh]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-ns-line px-5 py-4">
          <h2 id="sync-dialog-title" className="ns-heading text-ns-ink">
            Sync devices
          </h2>
          <button
            type="button"
            onClick={hide}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ns-ink-muted hover:bg-ns-sunken hover:text-ns-ink"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isOn && code ? (
            // ── Sync is on: show how to pair another device, and manage it ──
            <div className="flex flex-col gap-4">
              <p
                className={cn(
                  "ns-label rounded-ns-md px-3 py-2",
                  status.state === "error" || status.state === "removed"
                    ? "bg-ns-danger-soft text-ns-danger"
                    : status.state === "offline" || status.state === "unavailable"
                      ? "bg-ns-warning-soft text-ns-warning"
                      : "bg-ns-success-soft text-ns-success"
                )}
                role="status"
              >
                {describeSync(status, now)}
              </p>

              {status.state === "removed" ? (
                <div className="flex flex-col gap-2">
                  <p className="ns-body text-ns-ink-muted">
                    Your book is still on this device. Turn sync on again to start a new synced copy and pair your
                    other devices with the new code.
                  </p>
                  <Button variant="primary" disabled={busy} onClick={() => run(() => engine!.enable())}>
                    Turn on sync again
                  </Button>
                  <Button variant="ghost" onClick={() => engine!.disable()}>
                    Turn off sync
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-3 rounded-ns-md bg-ns-sunken p-4 text-center">
                    <QrCode value={pairLink} label="QR code for pairing another device" />
                    <p className="ns-label font-normal text-ns-ink-muted">
                      On your other device open Stock Tracker, then <b className="text-ns-ink">Data → Sync devices →
                      I have a code</b>, and scan this or type the code.
                    </p>
                    <div className="flex w-full items-center gap-2">
                      <code className="ns-body oc-num min-w-0 flex-1 truncate rounded-ns-sm bg-ns-card px-3 py-2 text-left text-ns-ink">
                        {showCode ? code : "••••-••••-••••-••••-••••-••••-••"}
                      </code>
                      <button
                        type="button"
                        onClick={() => setShowCode((v) => !v)}
                        title={showCode ? "Hide code" : "Show code"}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ns-ink-muted hover:bg-ns-card hover:text-ns-ink"
                      >
                        {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showCode ? "Hide code" : "Show code"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void navigator.clipboard.writeText(code).then(() => {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          })
                        }
                        title="Copy code"
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ns-ink-muted hover:bg-ns-card hover:text-ns-ink"
                      >
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">{copied ? "Copied" : "Copy code"}</span>
                      </button>
                    </div>
                    <p className="ns-caption font-normal text-ns-ink-subtle">
                      {copied
                        ? "Copied."
                        : "Keep this code safe, e.g. in your password manager: it unlocks your synced book."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => run(() => engine!.sync())}>
                      <RefreshCw className={cn("h-4 w-4", status.state === "syncing" && "animate-spin")} />
                      Sync now
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => engine!.disable()}>
                      Turn off on this device
                    </Button>
                    <Button variant="danger" size="sm" className="ml-auto" onClick={() => setConfirmDelete(true)}>
                      Delete synced copy
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : view === "intro" ? (
            // ── Sync is off ──
            <div className="flex flex-col gap-4">
              <p className="ns-body text-ns-ink-muted">
                Keep this book in step on your phone and laptop. It&apos;s encrypted on this device before it
                leaves, so the server can&apos;t read it, and there&apos;s no account to make. Every device keeps
                its own copy, so the app still works offline.
              </p>
              <Button variant="primary" disabled={busy} onClick={() => run(() => engine!.enable())}>
                Turn on sync
              </Button>
              <Button variant="secondary" onClick={() => setView("pair")}>
                I have a code
              </Button>
            </div>
          ) : (
            // ── Pair this device with a code ──
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await engine!.pair(codeInput, mode);
                  setCodeInput("");
                });
              }}
              className="flex flex-col gap-4"
            >
              <div>
                <label htmlFor="sync-code" className="oc-field-label">
                  Sync code
                </label>
                <div className="flex gap-2">
                  <input
                    id="sync-code"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="ABCD-EFGH-…"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className={cn(fieldClass, "ns-body h-11 min-w-0 flex-1 px-3.5 uppercase")}
                  />
                  <Button type="button" variant="secondary" className="h-11" onClick={() => setScanning((v) => !v)}>
                    <Camera className="h-4 w-4" />
                    {scanning ? "Stop" : "Scan"}
                  </Button>
                </div>
              </div>

              {scanning && <QrScanner onResult={onScan} />}

              <fieldset className="flex flex-col gap-2">
                <legend className="oc-field-label">This device&apos;s book</legend>
                {(
                  [
                    ["replace", "Use the synced book", "Replaces what's on this device. Export it first if you want a copy."],
                    ["merge", "Merge both books", "Keeps everything from both. Use it if this device has real entries too."],
                  ] as const
                ).map(([value, title, hint]) => (
                  <label
                    key={value}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-ns-md border p-3",
                      mode === value ? "border-ns-ocean-100 bg-ns-primary-soft" : "border-ns-line"
                    )}
                  >
                    <input
                      type="radio"
                      name="pair-mode"
                      value={value}
                      checked={mode === value}
                      onChange={() => setMode(value)}
                      className="mt-1 accent-[var(--primary)]"
                    />
                    <span>
                      <span className="ns-label block text-ns-ink">{title}</span>
                      <span className="ns-caption block font-normal text-ns-ink-muted">{hint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setView("intro")}>
                  Back
                </Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={busy || !codeInput.trim()}>
                  Pair this device
                </Button>
              </div>
            </form>
          )}

          {error && (
            <p role="alert" className="ns-label mt-4 rounded-ns-md bg-ns-danger-soft px-3 py-2 text-ns-danger">
              {error}
            </p>
          )}
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete the synced copy?"
        description="This removes the encrypted copy from the server and stops sync on every device. Each device keeps its own book. You can turn sync on again later with a new code."
        confirmLabel="Delete synced copy"
        tone="danger"
        onConfirm={() => {
          setConfirmDelete(false);
          void run(() => engine!.deleteRemote());
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
