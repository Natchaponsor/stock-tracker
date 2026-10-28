"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Log position: a buy/sell menu. `variant` picks the trigger: the primary pill
 * for the wide-screen top menu, or the raised add button in the phone tab bar,
 * where the menu opens upward.
 */
export function LogPositionMenu({
  variant = "pill",
  className,
}: {
  variant?: "pill" | "fab";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass = "ns-body flex w-full items-center gap-2 px-3 py-2 text-left text-ns-ink hover:bg-ns-sunken";

  return (
    <div className={cn("relative", className)} ref={menuRef}>
      {variant === "pill" ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="oc-btn oc-btn-primary px-4! py-2.5! text-[14px]!"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Log position
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Log position"
          className="oc-fab"
        >
          <Plus className="h-6 w-6" strokeWidth={2} />
        </button>
      )}

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-30 w-44 rounded-ns-md border border-ns-line bg-ns-card py-1 shadow-ns-card",
            variant === "pill" ? "right-0 mt-2" : "bottom-full left-1/2 mb-10 -translate-x-1/2"
          )}
        >
          <Link href="/positions/new?mode=buy" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
            <TrendingUp className="h-3.5 w-3.5 text-ns-success" />
            Buy
          </Link>
          <Link href="/positions/new?mode=sell" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
            <TrendingDown className="h-3.5 w-3.5 text-ns-danger" />
            Sell
          </Link>
        </div>
      )}
    </div>
  );
}
