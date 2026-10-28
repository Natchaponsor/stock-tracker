"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, RotateCcw, Trash2, Upload } from "lucide-react";
import { usePositionStore } from "@/store/usePositionStore";
import { buildExportPayload, downloadJson, validateImportPayload } from "@/lib/exportData";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import type { ExportPayload } from "@/lib/types";

type SimpleAction = "export" | "erase" | "reset";
type PendingAction = SimpleAction | "import" | null;

export function DataMenu() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [importPayload, setImportPayload] = useState<ExportPayload | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
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

  function runPendingAction() {
    if (pending === "export") {
      const payload = buildExportPayload(startingCash, positions, strategies, watchlist, customSectors);
      downloadJson(`stock-tracker-export-${new Date().toISOString().slice(0, 10)}.json`, payload);
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
        "This permanently deletes every position, strategy, watchlist symbol, and custom sector, and resets your cash balance to $0 — including the demo data. This cannot be undone.",
      confirmLabel: "Erase everything",
      tone: "danger",
    },
    reset: {
      title: "Reset to demo data?",
      description:
        "This replaces everything currently in the app — positions, strategies, watchlist, custom sectors, and cash balance — with the sample dataset. This cannot be undone.",
      confirmLabel: "Reset to demo",
      tone: "danger",
    },
  };

  const dialog =
    pending === "import" && importPayload
      ? {
          title: "Import this file?",
          description: `Found ${importPayload.positions.length} position${importPayload.positions.length === 1 ? "" : "s"}, ${importPayload.strategies.length} ${importPayload.strategies.length === 1 ? "strategy" : "strategies"}, ${importPayload.watchlist.length} watchlist symbol${importPayload.watchlist.length === 1 ? "" : "s"}, ${importPayload.customSectors.length} custom sector${importPayload.customSectors.length === 1 ? "" : "s"}, and a $${importPayload.startingCash.toLocaleString()} starting balance. This replaces everything currently in the app. This cannot be undone.`,
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
        className="ns-label flex h-9 cursor-pointer items-center gap-1 rounded-full bg-ns-sunken px-3.5 text-ns-ink-muted transition-colors hover:text-ns-ink"
      >
        Data
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileSelected} />

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-ns-md border border-ns-line bg-ns-card shadow-ns-card"
        >
          <p className="ns-caption border-b border-ns-line px-3 py-2 text-ns-ink-subtle">
            Your data · this browser only
          </p>
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
            Export data
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
        </div>
      )}

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
