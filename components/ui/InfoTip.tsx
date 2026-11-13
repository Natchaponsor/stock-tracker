"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * A small (i) that explains a field. Opens on hover or keyboard focus, and on
 * tap for touch screens; Escape or a tap elsewhere closes it. The text is tied
 * to the button with aria-describedby, so screen readers read it on focus.
 */
export function InfoTip({
  label,
  children,
  className,
  align = "start",
}: {
  /** What the button is about, e.g. "About the conversion rate". */
  label: string;
  children: ReactNode;
  className?: string;
  /** Which edge of the button the bubble lines up with. */
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const shown = open || pinned;

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setPinned(false);
      }
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPinned(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [shown]);

  return (
    <span
      ref={ref}
      className={cn("relative inline-flex align-middle", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={shown}
        aria-describedby={id}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          // A label wraps most fields; keep the tap from focusing the input under it.
          e.preventDefault();
          // A second tap closes it, even though the button still has focus.
          if (pinned) {
            setPinned(false);
            setOpen(false);
          } else {
            setPinned(true);
          }
        }}
        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-ns-ink-subtle transition-colors hover:text-ns-primary-text focus-visible:outline-2 focus-visible:outline-ns-primary"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span
        id={id}
        role="tooltip"
        hidden={!shown}
        className={cn(
          "ns-label absolute top-full z-40 mt-1.5 w-[min(18rem,calc(100vw-2.5rem))] rounded-ns-md bg-ns-ink px-3 py-2.5 font-normal text-ns-card shadow-ns-card",
          align === "start" ? "left-0 -ml-2" : "right-0 -mr-2"
        )}
      >
        {children}
      </span>
    </span>
  );
}
