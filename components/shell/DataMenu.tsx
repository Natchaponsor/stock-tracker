"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  Laptop,
  RefreshCcw,
  RotateCcw,
  Settings,
  Smartphone,
  Trash2,
  Upload,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useDataActions } from "@/components/settings/useDataActions";
import { promptInstall, useInstallApp } from "@/hooks/useInstallApp";
import { useSyncStatus } from "@/hooks/useSync";
import { useSyncDialog } from "@/hooks/useSyncDialog";
import { useBackupStatus } from "@/hooks/useBackupStatus";
import { describeSync } from "@/components/shell/SyncDialog";
import { useNow } from "@/components/log/clock";
import { cn } from "@/lib/cn";

/**
 * The header's Data menu: quick export, import, reset and erase, plus sync and
 * device shortcuts. Settings holds the same actions with more room; both use
 * useDataActions. `onPage` gives the trigger the white, lifted look it needs
 * on the gray page (web top bar).
 */
export function DataMenu({ onPage = false }: { onPage?: boolean }) {
  const [open, setOpen] = useState(false);
  const [iosInstallHelp, setIosInstallHelp] = useState(false);
  const actions = useDataActions();
  const install = useInstallApp();
  // Offered when the browser can install it (Chrome, Edge, Android) or on iPhone/iPad,
  // where it's done by hand; hidden once running as the installed app.
  const canInstall = !install.installed && (install.canPrompt || install.isIos);
  const sync = useSyncStatus();
  const syncOn = sync.state !== "off";
  const showSyncDialog = useSyncDialog((s) => s.show);
  const backup = useBackupStatus();
  const now = useNow();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /** Closes the menu, then runs the action. */
  const pick = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  const item = "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm no-underline hover:bg-ns-sunken";
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
          <button type="button" role="menuitem" onClick={pick(actions.requestExport)} className={cn(item, "text-ns-ink")}>
            <Download className={icon} />
            Export data (JSON backup)
          </button>
          <button type="button" role="menuitem" onClick={pick(actions.exportCsv)} className={cn(item, "text-ns-ink")}>
            <FileSpreadsheet className={icon} />
            Export recorded log (CSV)
          </button>
          <button type="button" role="menuitem" onClick={pick(actions.pickImportFile)} className={cn(item, "text-ns-ink")}>
            <Upload className={icon} />
            Import data
          </button>
          <button type="button" role="menuitem" onClick={pick(actions.requestReset)} className={cn(item, "text-ns-ink")}>
            <RotateCcw className={icon} />
            Reset to demo data
          </button>
          <button type="button" role="menuitem" onClick={pick(actions.requestErase)} className={cn(item, "text-ns-danger")}>
            <Trash2 className="h-3.5 w-3.5" />
            Erase all data
          </button>

          <div className="border-t border-ns-line">
            <button
              type="button"
              role="menuitem"
              onClick={pick(() => showSyncDialog())}
              className={cn(item, "text-ns-primary-text")}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              {syncOn ? "Sync devices" : "Sync with another device"}
            </button>
            <Link
              href="/settings#devices"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(item, "text-ns-primary-text")}
            >
              <Laptop className="h-3.5 w-3.5" />
              Manage devices
            </Link>
            {canInstall && (
              <button
                type="button"
                role="menuitem"
                onClick={pick(() => (install.canPrompt ? void promptInstall() : setIosInstallHelp(true)))}
                className={cn(item, "text-ns-primary-text")}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Install app
              </button>
            )}
          </div>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn(item, "border-t border-ns-line text-ns-ink")}
          >
            <Settings className={icon} />
            All settings
          </Link>
        </div>
      )}

      {actions.ui}

      <ConfirmDialog
        open={iosInstallHelp}
        title="Add Stock Tracker to your Home Screen"
        description="Tap the Share button in Safari's toolbar, then choose Add to Home Screen. It opens full-screen with its own icon, and your data stays on this device."
        confirmLabel="Got it"
        hideCancel
        onConfirm={() => setIosInstallHelp(false)}
        onCancel={() => setIosInstallHelp(false)}
      />
    </div>
  );
}
