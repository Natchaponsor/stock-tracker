"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function LogPositionMenu() {
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="stamp flex h-8 items-center gap-1.5 bg-accent px-2.5 text-on-accent transition-colors hover:bg-accent-strong"
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Log Position</span>
        <span className="sr-only sm:hidden">Log Position</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-44 border border-rule-strong bg-card py-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
        >
          <Link
            href="/positions/new?mode=buy"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-panel")}
          >
            <TrendingUp className="h-3.5 w-3.5 text-gain" />
            Buy
          </Link>
          <Link
            href="/positions/new?mode=sell"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-panel")}
          >
            <TrendingDown className="h-3.5 w-3.5 text-loss" />
            Sell
          </Link>
        </div>
      )}
    </div>
  );
}
