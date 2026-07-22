"use client";

import { useState } from "react";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { usePositionStore } from "@/store/usePositionStore";
import { Button } from "@/components/ui/Button";

export function TopBar() {
  const hidePnl = usePositionStore((s) => s.hidePnl);
  const toggleHidePnl = usePositionStore((s) => s.toggleHidePnl);
  const resetDemo = usePositionStore((s) => s.resetDemo);
  const [confirmingReset, setConfirmingReset] = useState(false);

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
        <Button
          variant={confirmingReset ? "danger" : "ghost"}
          size="sm"
          onClick={() => {
            if (confirmingReset) {
              resetDemo();
              setConfirmingReset(false);
            } else {
              setConfirmingReset(true);
              setTimeout(() => setConfirmingReset(false), 3000);
            }
          }}
          title="Reset demo data"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {confirmingReset ? "Confirm reset?" : "Reset demo"}
        </Button>
      </div>
    </div>
  );
}
