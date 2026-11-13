"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { glyph } from "@/lib/format";
import { FX_CODES, FX_CURRENCIES } from "@/lib/fx";

/**
 * A rate change. Neutral ink with an arrow, never green or red: a rising USD/THB
 * is good news for someone converting dollars to baht and bad news the other way.
 */
export function FxChange({ value, suffix, className }: { value: number | null; suffix?: string; className?: string }) {
  if (value === null) return <span className={cn("oc-num text-ns-ink-subtle", className)}>—</span>;
  return (
    <span className={cn("oc-num whitespace-nowrap text-ns-ink-muted", className)}>
      <span aria-hidden="true" className="text-[0.75em]">
        {glyph(value)}{" "}
      </span>
      <span className="sr-only">{value > 0 ? "up " : value < 0 ? "down " : ""}</span>
      {Math.abs(value * 100).toFixed(2)}%{suffix ? ` ${suffix}` : ""}
    </span>
  );
}

/**
 * "Stocks | FX" at the top of Analysis and FX on phones, where the tab bar has
 * no room for an FX tab. On the web set, FX has its own sidebar entry.
 */
export function FxSectionSwitch() {
  const pathname = usePathname();
  const onFx = pathname.startsWith("/fx");
  const item = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex-1 rounded-full py-2 text-center text-sm font-medium no-underline transition-colors",
        active ? "bg-ns-card text-ns-ink shadow-ns-card" : "text-ns-ink-muted hover:text-ns-ink"
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Analysis sections" className="flex rounded-full bg-ns-sunken p-1 md:hidden">
      {item("/analysis", "Stocks", !onFx)}
      {item("/fx", "FX", onFx)}
    </nav>
  );
}

export const selectClass =
  "h-11 w-full rounded-ns-md border border-ns-line bg-ns-card px-3 text-[15px] text-ns-ink focus:border-ns-primary focus:outline-none focus:ring-3 focus:ring-ns-primary-soft";

export function CurrencySelect({
  value,
  onChange,
  label,
  exclude,
  className,
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
  exclude?: string;
  className?: string;
}) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={cn(selectClass, className)}>
      {FX_CODES.filter((c) => c !== exclude).map((code) => (
        <option key={code} value={code}>
          {code} · {FX_CURRENCIES[code]}
        </option>
      ))}
    </select>
  );
}

/** A loading placeholder that can sit inside text (a span, not NsSkeleton's div). */
export function InlineSkeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block animate-pulse rounded-ns-sm bg-ns-sunken align-middle", className)} />;
}
