"use client";

import { cn } from "@/lib/cn";

interface SegmentedProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center rounded-full bg-ns-sunken p-1",
        className
      )}
    >
      {options.map((opt) => (
        <button
          key={opt}
          role="tab"
          type="button"
          aria-selected={opt === value}
          onClick={() => onChange(opt)}
          className={cn(
            "cursor-pointer rounded-full font-medium transition-colors duration-150",
            size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm",
            opt === value
              ? "bg-ns-card text-ns-ink shadow-ns-card"
              : "text-ns-ink-muted hover:text-ns-ink"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
