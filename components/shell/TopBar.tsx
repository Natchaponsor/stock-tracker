"use client";

import { Eye, EyeOff } from "lucide-react";
import { usePositionStore } from "@/store/usePositionStore";
import { DataMenu } from "./DataMenu";

export function TopBar() {
  const hidePnl = usePositionStore((s) => s.hidePnl);
  const toggleHidePnl = usePositionStore((s) => s.toggleHidePnl);

  return (
    <div className="border-b border-border bg-bg/95">
      <div className="mx-auto flex max-w-[1200px] items-center justify-end gap-2 px-4 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={toggleHidePnl}
          aria-pressed={hidePnl}
          title="Hide P&L (privacy mode)"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-panel text-fg-muted hover:text-fg transition-colors"
        >
          {hidePnl ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <DataMenu />
      </div>
    </div>
  );
}
