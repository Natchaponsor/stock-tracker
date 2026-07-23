"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, RotateCcw, Trash2 } from "lucide-react";
import { usePositionStore } from "@/store/usePositionStore";
import { buildExportPayload, downloadJson } from "@/lib/exportData";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";

type PendingAction = "export" | "erase" | "reset" | null;

export function DataMenu() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const startingCash = usePositionStore((s) => s.startingCash);
  const positions = usePositionStore((s) => s.positions);
  const strategies = usePositionStore((s) => s.strategies);
  const watchlist = usePositionStore((s) => s.watchlist);
  const eraseAll = usePositionStore((s) => s.eraseAll);
  const resetDemo = usePositionStore((s) => s.resetDemo);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function runPendingAction() {
    if (pending === "export") {
      const payload = buildExportPayload(startingCash, positions, strategies, watchlist);
      downloadJson(`stock-tracker-export-${new Date().toISOString().slice(0, 10)}.json`, payload);
    } else if (pending === "erase") {
      eraseAll();
    } else if (pending === "reset") {
      resetDemo();
    }
    setPending(null);
  }

  const dialogCopy: Record<Exclude<PendingAction, null>, { title: string; description: string; confirmLabel: string; tone: "default" | "danger" }> = {
    export: {
      title: "Export your data?",
      description: "Downloads a JSON file with your cash balance, positions, strategies, and watchlist.",
      confirmLabel: "Export",
      tone: "default",
    },
    erase: {
      title: "Erase all data?",
      description:
        "This permanently deletes every position, strategy, and watchlist symbol, and resets your cash balance to $0 — including the demo data. This cannot be undone.",
      confirmLabel: "Erase everything",
      tone: "danger",
    },
    reset: {
      title: "Reset to demo data?",
      description:
        "This replaces everything currently in the app — positions, strategies, watchlist, and cash balance — with the sample dataset. This cannot be undone.",
      confirmLabel: "Reset to demo",
      tone: "danger",
    },
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-8 items-center gap-1 rounded-lg border border-border bg-panel px-2.5 text-sm font-medium text-fg-muted hover:text-fg transition-colors"
      >
        Data
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-52 overflow-hidden rounded-lg border border-border bg-panel py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setPending("export");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-card"
          >
            <Download className="h-3.5 w-3.5 text-fg-subtle" />
            Export data
          </button>
          <button
            type="button"
            onClick={() => {
              setPending("reset");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-card"
          >
            <RotateCcw className="h-3.5 w-3.5 text-fg-subtle" />
            Reset to demo data
          </button>
          <button
            type="button"
            onClick={() => {
              setPending("erase");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-loss hover:bg-card"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Erase all data
          </button>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending ? dialogCopy[pending].title : ""}
        description={pending ? dialogCopy[pending].description : ""}
        confirmLabel={pending ? dialogCopy[pending].confirmLabel : ""}
        tone={pending ? dialogCopy[pending].tone : "default"}
        onConfirm={runPendingAction}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
