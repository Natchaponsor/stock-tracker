"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Check, Laptop, Pencil, QrCode, RefreshCw, Smartphone, Tablet, X } from "lucide-react";
import { NsCard } from "@/components/navy/primitives";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { fieldClass } from "@/components/form/FormField";
import { SettingRow } from "@/components/settings/SettingRow";
import { describeSync } from "@/components/shell/SyncDialog";
import { usePositionStore } from "@/store/usePositionStore";
import { useSyncStatus } from "@/hooks/useSync";
import { useSyncDialog } from "@/hooks/useSyncDialog";
import { promptInstall, useInstallApp } from "@/hooks/useInstallApp";
import { useNow } from "@/components/log/clock";
import { getSyncEngine } from "@/lib/sync/client";
import { getLocalDevice, MAX_DEVICE_NAME, setLocalDeviceName, type LocalDevice } from "@/lib/sync/device";
import { formatAgo } from "@/lib/priceTime";
import { cn } from "@/lib/cn";
import type { SyncDevice } from "@/lib/types";

function DeviceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = /iPhone|Android/i.test(name) ? Smartphone : /iPad|Tablet/i.test(name) ? Tablet : Laptop;
  return <Icon className={className} aria-hidden="true" />;
}

/**
 * Devices & sync: this device's name, the devices sharing the book, and every
 * sync control (turn on, pair, sync now, change code, turn off, delete).
 *
 * Sync works by a shared code, so removing a device from the list only tidies
 * it; locking a device out means changing the code, which the copy says.
 */
export function DeviceSettings() {
  const status = useSyncStatus();
  const now = useNow();
  const showSyncDialog = useSyncDialog((s) => s.show);
  const devices = usePositionStore((s) => s.devices);
  const touchDevice = usePositionStore((s) => s.touchDevice);
  const removeDevice = usePositionStore((s) => s.removeDevice);
  const forgetOtherDevices = usePositionStore((s) => s.forgetOtherDevices);
  const install = useInstallApp();
  const canInstall = !install.installed && (install.canPrompt || install.isIos);

  const [local, setLocal] = useState<LocalDevice>(() => getLocalDevice());
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(local.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"rotate" | "delete" | "off" | { remove: SyncDevice } | null>(null);
  const [iosInstallHelp, setIosInstallHelp] = useState(false);

  const isOn = status.state !== "off";
  const engine = getSyncEngine();
  const others = devices.filter((d) => d.id !== local.id);

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

  function saveName() {
    const saved = setLocalDeviceName(draft);
    setLocal(saved);
    setDraft(saved.name);
    setRenaming(false);
    if (engine.isOn()) touchDevice(saved);
  }

  const statusTone =
    status.state === "error" || status.state === "removed"
      ? "bg-ns-danger-soft text-ns-danger"
      : status.state === "offline" || status.state === "unavailable"
        ? "bg-ns-warning-soft text-ns-warning"
        : status.state === "off"
          ? "bg-ns-sunken text-ns-ink-muted"
          : "bg-ns-success-soft text-ns-success";

  const confirmCopy =
    confirm === "rotate"
      ? {
          title: "Change the sync code?",
          description:
            "This deletes the synced copy and starts a new one with a new code. Every other device stops syncing until you pair it again with the new code, so a lost device or anyone holding the old code is locked out. Your book stays on every device.",
          label: "Change code",
          tone: "danger" as const,
        }
      : confirm === "delete"
        ? {
            title: "Delete the synced copy?",
            description:
              "This removes the encrypted copy from the server and stops sync on every device. Each device keeps its own book. You can turn sync on again later with a new code.",
            label: "Delete synced copy",
            tone: "danger" as const,
          }
        : confirm === "off"
          ? {
              title: "Turn off sync on this device?",
              description:
                "This device keeps its book but stops syncing. Your other devices keep syncing with each other. To join again you'll need the sync code.",
              label: "Turn off",
              tone: "default" as const,
            }
          : confirm
            ? {
                title: `Remove ${confirm.remove.name}?`,
                description:
                  "This only takes it off this list. If that device still has the sync code it comes back the next time it syncs. To lock it out, change the sync code instead.",
                label: "Remove from list",
                tone: "default" as const,
              }
            : null;

  function onConfirm() {
    const action = confirm;
    setConfirm(null);
    if (action === "rotate") {
      void run(async () => {
        await engine.deleteRemote();
        forgetOtherDevices(local.id);
        await engine.enable();
        showSyncDialog();
      });
    } else if (action === "delete") {
      void run(() => engine.deleteRemote());
    } else if (action === "off") {
      engine.disable();
    } else if (action) {
      removeDevice(action.remove.id);
    }
  }

  return (
    <NsCard title="Devices & sync" meta="Keep this book in step on your phone and computer, encrypted on the device">
      <p className={cn("ns-label mb-4 rounded-ns-md px-3.5 py-2.5", statusTone)} role="status">
        {isOn ? describeSync(status, now) : "Sync is off · this book lives only in this browser"}
      </p>

      {/* ── This device ── */}
      <div className="flex items-center gap-3 rounded-ns-md border border-ns-line p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ns-primary-soft text-ns-primary-text">
          <DeviceIcon name={local.name} className="h-5 w-5" />
        </span>
        {renaming ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveName();
            }}
          >
            <label htmlFor="device-name" className="sr-only">
              Device name
            </label>
            <input
              id="device-name"
              value={draft}
              maxLength={MAX_DEVICE_NAME}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className={cn(fieldClass, "ns-body h-10 min-w-0 flex-1 px-3")}
            />
            <Button type="submit" size="sm" variant="primary" disabled={!draft.trim()}>
              <Check className="h-4 w-4" />
              Save
            </Button>
            <button
              type="button"
              onClick={() => {
                setDraft(local.name);
                setRenaming(false);
              }}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ns-ink-muted hover:bg-ns-sunken"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cancel</span>
            </button>
          </form>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="ns-body min-w-0 break-words font-semibold text-ns-ink">{local.name}</span>
                <span className="oc-badge oc-badge-info shrink-0">This device</span>
              </p>
              <p className="ns-caption mt-0.5 font-normal text-ns-ink-subtle">
                {isOn ? "Shown by this name on your other devices" : "Name it so you can tell your devices apart"}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setRenaming(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </Button>
          </>
        )}
      </div>

      {/* ── Other devices ── */}
      {isOn && (
        <div className="mt-4">
          <p className="ns-label text-ns-ink-muted">Other devices</p>
          {others.length === 0 ? (
            <p className="ns-label mt-2 rounded-ns-md bg-ns-sunken px-3.5 py-3 font-normal text-ns-ink-muted">
              No other devices yet. Pair one to keep this book on both.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-ns-line rounded-ns-md border border-ns-line">
              {others.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                  <DeviceIcon name={d.name} className="h-4 w-4 shrink-0 text-ns-ink-subtle" />
                  <div className="min-w-0 flex-1">
                    <p className="ns-body truncate text-ns-ink">{d.name}</p>
                    <p className="ns-caption font-normal text-ns-ink-subtle">
                      Last synced {now === null ? format(new Date(d.lastSeenAt), "MMM d") : formatAgo(now - Date.parse(d.lastSeenAt))}
                      {" · "}joined {format(new Date(d.addedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setConfirm({ remove: d })}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Controls ── */}
      <div className="mt-5">
        {!isOn ? (
          <>
            <SettingRow
              title="Turn on sync"
              description="Encrypted on this device before it leaves, so the server can't read it. No account. Every device keeps its own copy and works offline."
            >
              <Button size="sm" variant="primary" disabled={busy} onClick={() => run(() => engine.enable().then(() => showSyncDialog()))}>
                Turn on sync
              </Button>
            </SettingRow>
            <SettingRow title="Join another device's book" description="Already syncing on another device? Pair this one with its code or QR.">
              <Button size="sm" variant="secondary" onClick={() => showSyncDialog(null, { pair: true })}>
                I have a code
              </Button>
            </SettingRow>
          </>
        ) : status.state === "removed" ? (
          <SettingRow
            title="The synced copy is gone"
            description="It was deleted, or the code was changed on another device. Pair with the new code, or start a new synced copy from this book."
          >
            <Button size="sm" variant="secondary" onClick={() => showSyncDialog()}>
              Fix sync
            </Button>
          </SettingRow>
        ) : (
          <>
            <SettingRow title="Pair another device" description="Shows the QR code and sync code to open on your other device.">
              <Button size="sm" variant="primary" onClick={() => showSyncDialog()}>
                <QrCode className="h-4 w-4" />
                Show code
              </Button>
            </SettingRow>
            <SettingRow title="Sync now" description="It also syncs on its own when you open the app and after every change.">
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => engine.sync())}>
                <RefreshCw className={cn("h-4 w-4", status.state === "syncing" && "animate-spin")} />
                Sync now
              </Button>
            </SettingRow>
            <SettingRow
              title="Change sync code"
              description="Lost a device, or shared the code by mistake? A new code locks out every device until you pair it again."
            >
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirm("rotate")}>
                Change code
              </Button>
            </SettingRow>
            <SettingRow title="Turn off on this device" description="This device keeps its book; the others keep syncing.">
              <Button size="sm" variant="ghost" onClick={() => setConfirm("off")}>
                Turn off
              </Button>
            </SettingRow>
            <SettingRow
              title="Delete synced copy"
              tone="danger"
              description="Removes the encrypted copy from the server and stops sync everywhere. Each device keeps its book."
            >
              <Button size="sm" variant="danger" disabled={busy} onClick={() => setConfirm("delete")}>
                Delete
              </Button>
            </SettingRow>
          </>
        )}
        {canInstall && (
          <SettingRow
            title="Install on this device"
            description="Open Stock Tracker full-screen from your home screen or dock, with its own icon."
          >
            <Button
              size="sm"
              variant="secondary"
              onClick={() => (install.canPrompt ? void promptInstall() : setIosInstallHelp(true))}
            >
              Install app
            </Button>
          </SettingRow>
        )}
      </div>

      {error && (
        <p role="alert" className="ns-label mt-4 rounded-ns-md bg-ns-danger-soft px-3 py-2 text-ns-danger">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmCopy !== null}
        title={confirmCopy?.title ?? ""}
        description={confirmCopy?.description ?? ""}
        confirmLabel={confirmCopy?.label ?? ""}
        tone={confirmCopy?.tone ?? "default"}
        onConfirm={onConfirm}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={iosInstallHelp}
        title="Add Stock Tracker to your Home Screen"
        description="Tap the Share button in Safari's toolbar, then choose Add to Home Screen. It opens full-screen with its own icon, and your data stays on this device."
        confirmLabel="Got it"
        hideCancel
        onConfirm={() => setIosInstallHelp(false)}
        onCancel={() => setIosInstallHelp(false)}
      />
    </NsCard>
  );
}
