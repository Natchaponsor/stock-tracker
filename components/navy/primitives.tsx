"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { glyph } from "@/lib/format";
import { resolveSector } from "@/lib/sectors";
import { usePositionStore } from "@/store/usePositionStore";

/**
 * Navy Stream building blocks for the dashboard. Classes prefixed `oc-` come
 * from styles/navy-stream/bundle.css; `ns-` utilities are the Tailwind bridge
 * in app/globals.css. Neither carries a raw colour.
 */

/**
 * A white card with a heading row. The dashboard's unit of content.
 * `collapsible` turns the heading into a toggle; `defaultOpen` sets where it starts.
 */
export function NsCard({
  title,
  meta,
  action,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const shown = !collapsible || open;

  const heading = (
    <div className="min-w-0 flex-1 basis-48">
      <h2 className="ns-heading text-ns-ink">{title}</h2>
      {meta ? <p className="ns-label mt-0.5 font-normal text-ns-ink-muted">{meta}</p> : null}
    </div>
  );

  return (
    <section className={cn("oc-card min-w-0", className)}>
      {/* Wraps so a wide action drops under the heading on phones instead of squeezing it. */}
      <div className={cn("flex flex-wrap items-start justify-between gap-x-3 gap-y-2.5", shown && "mb-3")}>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={bodyId}
            className="-m-1 flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded-ns-sm p-1 text-left"
          >
            {heading}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "mt-0.5 ml-auto h-5 w-5 shrink-0 text-ns-ink-subtle transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        ) : (
          heading
        )}
        {shown && action}
      </div>
      <div id={bodyId} hidden={!shown}>
        {children}
      </div>
    </section>
  );
}

export function NsEmpty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-ns-md bg-ns-sunken px-4 py-5">
      <p className="ns-label text-ns-ink">{title}</p>
      {description ? <p className="ns-label mt-1 max-w-md font-normal text-ns-ink-muted">{description}</p> : null}
    </div>
  );
}

/**
 * Gain or loss text. Unlike spending, a rise is good news for a holding:
 * gains read in `success`, losses in `danger`, flat in `ink-muted`. The glyph
 * and sign carry the meaning too, so colour is never the only cue.
 */
export function NsPnl({
  value,
  formatted,
  className,
  showGlyph = true,
}: {
  value: number;
  formatted: string;
  className?: string;
  showGlyph?: boolean;
}) {
  const hidePnl = usePositionStore((s) => s.hidePnl);
  const tone = value > 0 ? "text-ns-success" : value < 0 ? "text-ns-danger" : "text-ns-ink-muted";
  return (
    <span className={cn("oc-num whitespace-nowrap", tone, className)}>
      {showGlyph && <span aria-hidden="true" className="text-[0.75em]">{glyph(value)} </span>}
      {hidePnl ? "••••" : formatted}
    </span>
  );
}

/** A change pill: up is good news (`oc-badge-up`), down is bad (`oc-badge-down`). */
export function NsChangeBadge({ value, children }: { value: number | null; children: ReactNode }) {
  const kind =
    value === null || value === 0 ? "oc-badge-info" : value > 0 ? "oc-badge-up" : "oc-badge-down";
  return (
    <span className={cn("oc-badge oc-num whitespace-nowrap", kind)}>
      {value !== null && <span aria-hidden="true">{glyph(value)}</span>}
      {children}
    </span>
  );
}

/** A symbol's mark: a circle in its sector's category colour with the ticker's first letter. */
export function SymbolMark({ symbol, size = 32 }: { symbol: string; size?: number }) {
  const customSectors = usePositionStore((s) => s.customSectors);
  const sector = resolveSector(symbol, customSectors);
  return (
    <span
      aria-hidden="true"
      title={sector.name}
      className="oc-cat-icon ns-label font-semibold"
      style={{ background: sector.color, width: size, height: size }}
    >
      {symbol.charAt(0)}
    </span>
  );
}

export function NsSkeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-ns-sm bg-ns-sunken", className)} />;
}
