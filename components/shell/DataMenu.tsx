"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, Download, FileSpreadsheet, RefreshCcw, RotateCcw, Smartphone, Trash2, Upload } from "lucide-react";
import { usePositionStore } from "@/store/usePositionStore";
import { buildExportPayload, downloadJson, downloadText, validateImportPayload } from "@/lib/exportData";
import { buildLedgerCsv } from "@/lib/csv";
import { backupStatus } from "@/lib/backup";
import { useNow } from "@/components/log/clock";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { promptInstall, useInstallApp } from "@/hooks/useInstallApp";
import { useSyncStatus } from "@/hooks/useSync";
import { useSyncDialog } from "@/hooks/useSyncDialog";
import { describeSync } from "@/components/shell/SyncDialog";
import { cn } from "@/lib/cn";
import type { ExportPayload } from "@/lib/types";

type SimpleAction = "export" | "erase" | "reset";
type PendingAction = SimpleAction | "import" | null;

/** `onPage` gives the trigger the white, lifted look it needs on the gray page (web top bar). */
export function DataMenu({ onPage = false }: { onPage?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [importPayload, setImportPayload] = useState<ExportPayload | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [iosInstallHelp, setIosInstallHelp] = useState(false);
  const install = useInstallApp();
  // Offered when the browser can install it (Chrome, Edge, Android) or on iPhone/iPad,
  // where it's done by hand; hidden once running as the installed app.
  const canInstall = !install.installed && (install.canPrompt || install.isIos);
  const sync = useSyncStatus();
  const syncOn = sync.state !== "off";
  const showSyncDialog = useSyncDialog((s) => s.show);
  // With sync on, whole-book changes reach every paired device; say so before they happen.
  const reachesDevices = syncOn ? " With sync on, this also happens on your paired devices." : "";
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startingCash = usePositionStore((s) => s.startingCash);
  const positions = usePositionStore((s) => s.positions);
  const strategies = usePositionStore((s) => s.strategies);
  const watchlist = usePositionStore((s) => s.watchlist);
  const customSectors = usePositionStore((s) => s.customSectors);
  const eraseAll = usePositionStore((s) => s.eraseAll);
  const resetDemo = usePositionStore((s) => s.resetDemo);
  const importData = usePositionStore((s) => s.importData);
  const markExported = usePositionStore((s) => s.markExported);
  const lastExportedAt = usePositionStore((s) => s.lastExportedAt);
  const bookStartedAt = usePositionStore((s) => s.bookStartedAt);
  const now = useNow();
  const backup = backupStatus({ lastExportedAt, bookStartedAt, hasData: positions.length > 0, now });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const result = validateImportPayload(json);
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      setImportPayload(result.payload);
      setPending("import");
    } catch {
      setImportError("That file isn't valid JSON.");
    }
  }

  function exportCsv() {
    downloadText(
      `stock-tracker-recorded-log-${format(new Date(), "yyyy-MM-dd")}.csv`,
      buildLedgerCsv(positions, strategies),
      "text/csv;charset=utf-8;"
    );
  }

  function runPendingAction() {
    if (pending === "export") {
      const payload = buildExportPayload(startingCash, positions, strategies, watchlist, customSectors);
      downloadJson(`stock-tracker-export-${format(new Date(), "yyyy-MM-dd")}.json`, payload);
      markExported();
    } else if (pending === "erase") {
      eraseAll();
    } else if (pending === "reset") {
      resetDemo();
    } else if (pending === "import" && importPayload) {
      importData(importPayload);
    }
    setPending(null);
    setImportPayload(null);
  }

  const simpleCopy: Record<SimpleAction, { title: string; description: string; confirmLabel: string; tone: "default" | "danger" }> = {
    export: {
      title: "Export your data?",
      description: "Downloads a JSON file with your cash balance, positions, strategies, watchlist, and custom sectors.",
      confirmLabel: "Export",
      tone: "default",
    },
    erase: {
      title: "Erase all data?",
      description:
        "This permanently deletes every position, strategy, watchlist symbol, and custom sector, and resets your cash balance to $0 — including the demo data. This cannot be undone." +
        reachesDevices,
      confirmLabel: "Erase everything",
      tone: "danger",
    },
    reset: {
      title: "Reset to demo data?",
      description:
        "This replaces everything currently in the app — positions, strategies, watchlist, custom sectors, and cash balance — with the sample dataset. This cannot be undone." +
        reachesDevices,
      confirmLabel: "Reset to demo",
      tone: "danger",
    },
  };

  const dialog =
    pending === "import" && importPayload
      ? {
          title: "Import this file?",
          description: `Found ${importPayload.positions.length} position${importPayload.positions.length === 1 ? "" : "s"}, ${importPayload.strategies.length} ${importPayload.strategies.length === 1 ? "strategy" : "strategies"}, ${importPayload.watchlist.length} watchlist symbol${importPayload.watchlist.length === 1 ? "" : "s"}, ${importPayload.customSectors.length} custom sector${importPayload.customSectors.length === 1 ? "" : "s"}, and a $${importPayload.startingCash.toLocaleString()} starting balance. This replaces everything currently in the app. This cannot be undone.${reachesDevices}`,
          confirmLabel: "Import & replace",
          tone: "danger" as const,
        }
      : pending && pending !== "import"
        ? simpleCopy[pending]
        : null;

  const item = "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-ns-sunken";
  const icon = "h-3.5 w-3.5 text-ns-ink-subtle";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "ns-label flex cursor-pointer items-center gap-1 rounded-full px-3.5 text-ns-ink-muted transition-colors hover:text-ns-ink",
          onPage ? "h-10 bg-ns-card shadow-ns-card" : "h-9 bg-ns-sunken"
        )}
      >
        Data
        {backup.due && (
          <>
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ns-warning" />
            <span className="sr-only">(backup due)</span>
          </>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileSelected} />

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-ns-md border border-ns-line bg-ns-card shadow-ns-card"
        >
          <div className="border-b border-ns-line px-3 py-2">
            <p className="ns-caption text-ns-ink-muted">
              {syncOn ? `Your data · ${describeSync(sync, now)}` : "Your data · this browser only"}
            </p>
            <p className={cn("ns-caption mt-0.5", backup.due ? "text-ns-warning" : "text-ns-ink-muted")}>
              {backup.label}
            </p>
            {backup.due && (
              <p className="ns-caption mt-1 font-normal text-ns-ink-muted">
                It only lives here. Export a copy so you can restore it.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setPending("export");
              setOpen(false);
            }}
            role="menuitem"
            className={cn(item, "text-ns-ink")}
          >
            <Download className={icon} />
            Export data (JSON backup)
          </button>
          <button
            type="button"
            onClick={() => {
              exportCsv();
              setOpen(false);
            }}
            role="menuitem"
            className={cn(item, "text-ns-ink")}
          >
            <FileSpreadsheet className={icon} />
            Export recorded log (CSV)
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              fileInputRef.current?.click();
            }}
            role="menuitem"
            className={cn(item, "text-ns-ink")}
          >
            <Upload className={icon} />
            Import data
          </button>
          <button
            type="button"
            onClick={() => {
              setPending("reset");
              setOpen(false);
            }}
            role="menuitem"
            className={cn(item, "text-ns-ink")}
          >
            <RotateCcw className={icon} />
            Reset to demo data
          </button>
          <button
            type="button"
            onClick={() => {
              setPending("erase");
              setOpen(false);
            }}
            role="menuitem"
            className={cn(item, "text-ns-danger")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Erase all data
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              showSyncDialog();
            }}
            role="menuitem"
            className={cn(item, "border-t border-ns-line text-ns-primary-text")}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            {syncOn ? "Sync devices" : "Sync with another device"}
          </button>
          {canInstall && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                if (install.canPrompt) void promptInstall();
                else setIosInstallHelp(true);
              }}
              role="menuitem"
              className={cn(item, "text-ns-primary-text")}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Install app
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={iosInstallHelp}
        title="Add Stock Tracker to your Home Screen"
        description="Tap the Share button in Safari's toolbar, then choose Add to Home Screen. It opens full-screen with its own icon, and your data stays on this device."
        confirmLabel="Got it"
        hideCancel
        onConfirm={() => setIosInstallHelp(false)}
        onCancel={() => setIosInstallHelp(false)}
      />

      <ConfirmDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        description={dialog?.description ?? ""}
        confirmLabel={dialog?.confirmLabel ?? ""}
        tone={dialog?.tone ?? "default"}
        onConfirm={runPendingAction}
        onCancel={() => {
          setPending(null);
          setImportPayload(null);
        }}
      />

      <ConfirmDialog
        open={importError !== null}
        title="Couldn't import that file"
        description={importError ?? ""}
        confirmLabel="OK"
        tone="default"
        onConfirm={() => setImportError(null)}
        onCancel={() => setImportError(null)}
      />
    </div>
  );
}
