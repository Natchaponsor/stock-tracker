"use client";

import { Download, FileSpreadsheet, RotateCcw, Trash2, Upload } from "lucide-react";
import { NsCard } from "@/components/navy/primitives";
import { Button } from "@/components/ui/Button";
import { SettingRow } from "@/components/settings/SettingRow";
import { useDataActions } from "@/components/settings/useDataActions";
import { useBackupStatus } from "@/hooks/useBackupStatus";
import { cn } from "@/lib/cn";

/** Settings → Your data: the same actions as the header's Data menu, with room to explain each. */
export function DataSettings() {
  const actions = useDataActions();
  const backup = useBackupStatus();

  return (
    <NsCard
      title="Your data"
      meta={actions.syncOn ? "On this device, and synced to your paired devices" : "Stored in this browser only"}
    >
      <div
        className={cn(
          "mb-4 rounded-ns-md px-3.5 py-2.5",
          backup.due ? "bg-ns-warning-soft text-ns-warning" : "bg-ns-sunken text-ns-ink-muted"
        )}
        role={backup.due ? "status" : undefined}
      >
        <p className="ns-label">{backup.label}</p>
        {backup.due && (
          <p className="ns-label mt-0.5 font-normal">It only lives here. Export a copy so you can restore it.</p>
        )}
      </div>

      <SettingRow title="Export data" description="A JSON backup of everything. Import it here or on another device.">
        <Button size="sm" variant={backup.due ? "primary" : "secondary"} onClick={actions.requestExport}>
          <Download className="h-4 w-4" />
          Export JSON
        </Button>
      </SettingRow>
      <SettingRow title="Export recorded log" description="Every buy, sell and cash deposit as a spreadsheet (CSV).">
        <Button size="sm" variant="secondary" onClick={actions.exportCsv}>
          <FileSpreadsheet className="h-4 w-4" />
          Export CSV
        </Button>
      </SettingRow>
      <SettingRow title="Import data" description="Replaces this book with a JSON export. You'll see what's in the file first.">
        <Button size="sm" variant="secondary" onClick={actions.pickImportFile}>
          <Upload className="h-4 w-4" />
          Import JSON
        </Button>
      </SettingRow>
      <SettingRow title="Reset to demo data" description="Swap your book for the sample positions, to explore the app.">
        <Button size="sm" variant="ghost" onClick={actions.requestReset}>
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </SettingRow>
      <SettingRow
        title="Erase all data"
        tone="danger"
        description="Deletes every position, deposit, strategy and watchlist symbol, and sets cash to $0."
      >
        <Button size="sm" variant="danger" onClick={actions.requestErase}>
          <Trash2 className="h-4 w-4" />
          Erase
        </Button>
      </SettingRow>

      {actions.ui}
    </NsCard>
  );
}
