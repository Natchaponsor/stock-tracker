"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function LogPositionMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <Button variant="primary" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Log Position</span>
      </Button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-44 overflow-hidden rounded-lg border border-border bg-panel py-1 shadow-lg">
          <Link
            href="/positions/new?mode=buy"
            onClick={() => setOpen(false)}
            className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-card")}
          >
            <TrendingUp className="h-3.5 w-3.5 text-gain" />
            Buy
          </Link>
          <Link
            href="/positions/new?mode=sell"
            onClick={() => setOpen(false)}
            className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-card")}
          >
            <TrendingDown className="h-3.5 w-3.5 text-loss" />
            Sell
          </Link>
        </div>
      )}
    </div>
  );
}
