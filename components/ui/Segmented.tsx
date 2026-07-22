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
        "inline-flex items-center rounded-lg border border-border bg-panel p-0.5",
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
            "rounded-md font-medium transition-colors duration-150",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
            opt === value
              ? "bg-accent text-bg"
              : "text-fg-muted hover:text-fg"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
