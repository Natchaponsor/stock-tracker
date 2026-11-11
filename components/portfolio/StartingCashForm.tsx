"use client";

import { useState } from "react";
import { usePositionStore } from "@/store/usePositionStore";
import { cn } from "@/lib/cn";

/** The glass "Starting cash" editor that opens on the silk when the Cash pencil is pressed. */
export function StartingCashForm({ onDone, className }: { onDone: () => void; className?: string }) {
  const startingCash = usePositionStore((s) => s.startingCash);
  const setStartingCash = usePositionStore((s) => s.setStartingCash);
  const [draft, setDraft] = useState(String(startingCash));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const amount = parseFloat(draft);
        if (Number.isFinite(amount)) setStartingCash(amount);
        onDone();
      }}
      className={cn("oc-glass flex flex-wrap items-center gap-2 p-2", className)}
    >
      <label htmlFor="starting-cash" className="ns-label px-2 text-ns-on-hero-muted">
        Starting cash
      </label>
      <input
        id="starting-cash"
        type="number"
        step="0.01"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        className="ns-body oc-num h-10 min-w-0 flex-1 rounded-ns-sm border border-ns-glass-line bg-ns-glass px-3 text-ns-on-primary placeholder:text-ns-on-hero-muted focus-visible:outline-2 focus-visible:outline-ns-on-primary"
      />
      <button type="submit" className="oc-btn bg-ns-card px-4! py-2.5! text-ns-primary-text">
        Save
      </button>
      <button type="button" onClick={onDone} className="oc-btn bg-transparent px-3! py-2.5! text-ns-on-primary">
        Cancel
      </button>
    </form>
  );
}
