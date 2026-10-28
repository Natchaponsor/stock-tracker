import type { ReactNode } from "react";

/** A Navy Stream field: label above, white rounded box, blue border and soft ring on focus. */
export function FormField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="oc-field-label">{label}</span>
      {children}
      {hint && <span className="ns-caption mt-1.5 block font-normal text-ns-ink-subtle">{hint}</span>}
    </label>
  );
}

const fieldBase =
  "rounded-ns-md border border-ns-line bg-ns-card text-[15px] text-ns-ink placeholder:text-ns-ink-subtle focus:border-ns-primary focus:outline-none focus:ring-3 focus:ring-ns-primary-soft";

export const inputClass = `${fieldBase} h-11 w-full px-3.5 tabular-nums`;

export const textareaClass = `${fieldBase} w-full px-3.5 py-2.5`;

/** For inputs that size themselves (inline fill rows, journal box). */
export const fieldClass = fieldBase;
