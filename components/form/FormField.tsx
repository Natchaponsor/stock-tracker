import type { ReactNode } from "react";

export function FormField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      {children}
      {hint && <span className="block text-xs text-fg-subtle">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-9 w-full rounded-lg border border-border bg-panel px-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent tabular-nums";

export const textareaClass =
  "w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent";
