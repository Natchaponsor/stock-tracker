"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { usePositionStore } from "@/store/usePositionStore";
import { buildExportPayload, downloadJson, downloadText, validateImportPayload } from "@/lib/exportData";
import { buildLedgerCsv } from "@/lib/csv";
import { useSyncStatus } from "@/hooks/useSync";
import type { ExportPayload } from "@/lib/types";

type SimpleAction = "export" | "erase" | "reset";
type PendingAction = SimpleAction | "import" | null;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Export, CSV, import, reset and erase, each behind its own confirmation. Shared
 * by the Data menu in the header and Settings → Your data, so both behave the
 * same. Render `ui` once (the hidden file picker and the dialogs).
 */
export function useDataActions() {
  const [pending, setPending] = useState<PendingAction>(null);
  const [importPayload, setImportPayload] = useState<ExportPayload | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncOn = useSyncStatus().state !== "off";
  // With sync on, whole-book changes reach every paired device; say so before they happen.
  const reachesDevices = syncOn ? " With sync on, this also happens on your paired devices." : "";

  const startingCash = usePositionStore((s) => s.startingCash);
  const positions = usePositionStore((s) => s.positions);
  const strategies = usePositionStore((s) => s.strategies);
  const watchlist = usePositionStore((s) => s.watchlist);
  const customSectors = usePositionStore((s) => s.customSectors);
  const fxWatchlist = usePositionStore((s) => s.fxWatchlist);
  const fxAlerts = usePositionStore((s) => s.fxAlerts);
  const cashDeposits = usePositionStore((s) => s.cashDeposits);
  const eraseAll = usePositionStore((s) => s.eraseAll);
  const resetDemo = usePositionStore((s) => s.resetDemo);
  const importData = usePositionStore((s) => s.importData);
  const markExported = usePositionStore((s) => s.markExported);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;
    try {
      const result = validateImportPayload(JSON.parse(await file.text()));
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
      buildLedgerCsv(positions, strategies, cashDeposits),
      "text/csv;charset=utf-8;"
    );
  }

  function runPendingAction() {
    if (pending === "export") {
      const payload = buildExportPayload(
        startingCash,
        positions,
        strategies,
        watchlist,
        customSectors,
        fxWatchlist,
        fxAlerts,
        cashDeposits
      );
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
      description:
        "Downloads a JSON file with your cash balance and deposits, positions, strategies, watchlist, custom sectors, and FX pairs and alerts.",
      confirmLabel: "Export",
      tone: "default",
    },
    erase: {
      title: "Erase all data?",
      description:
        "This permanently deletes every position, cash deposit, strategy, watchlist symbol, and custom sector, and resets your cash balance to $0, including the demo data. This cannot be undone." +
        reachesDevices,
      confirmLabel: "Erase everything",
      tone: "danger",
    },
    reset: {
      title: "Reset to demo data?",
      description:
        "This replaces everything currently in the app (positions, cash deposits, strategies, watchlist, custom sectors, and cash balance) with the sample dataset. This cannot be undone." +
        reachesDevices,
      confirmLabel: "Reset to demo",
      tone: "danger",
    },
  };

  const dialog =
    pending === "import" && importPayload
      ? {
          title: "Import this file?",
          description: `Found ${plural(importPayload.positions.length, "position")}, ${plural(importPayload.cashDeposits.length, "cash deposit")}, ${plural(importPayload.strategies.length, "strategy", "strategies")}, ${plural(importPayload.watchlist.length, "watchlist symbol")}, ${plural(importPayload.customSectors.length, "custom sector")}, ${plural(importPayload.fxWatchlist.length, "FX pair")}, ${plural(importPayload.fxAlerts.length, "FX alert")}, and a $${importPayload.startingCash.toLocaleString()} starting balance. This replaces everything currently in the app. This cannot be undone.${reachesDevices}`,
          confirmLabel: "Import & replace",
          tone: "danger" as const,
        }
      : pending && pending !== "import"
        ? simpleCopy[pending]
        : null;

  const ui = (
    <>
      <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileSelected} />
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
        hideCancel
        onConfirm={() => setImportError(null)}
        onCancel={() => setImportError(null)}
      />
    </>
  );

  return {
    syncOn,
    requestExport: () => setPending("export"),
    requestReset: () => setPending("reset"),
    requestErase: () => setPending("erase"),
    pickImportFile: () => fileInputRef.current?.click(),
    exportCsv,
    ui,
  };
}
