import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A ruled band of the log sheet. The label column sits left of the
 * registration axis; the axis itself is the content cell's left rule, so
 * stacked bands join into one continuous hairline down the page.
 *
 * `title` is the band's heading — it is never an eyebrow above another one.
 */
export function Band({
  title,
  meta,
  action,
  children,
  className,
  contentClassName,
}: {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("border-t border-rule-strong", className)}>
      <div className="grid gap-x-6 gap-y-3 py-7 lg:grid-cols-[var(--axis)_1fr]">
        <div className="flex items-baseline justify-between gap-3 lg:block lg:pr-6">
          <h2 className="stamp-lg text-fg">{title}</h2>
          {meta ? <p className="stamp mt-0 text-fg-subtle lg:mt-1.5">{meta}</p> : null}
        </div>
        <div className={cn("min-w-0 lg:border-l lg:border-rule lg:pl-6", contentClassName)}>
          {action ? <div className="mb-3 flex justify-end">{action}</div> : null}
          {children}
        </div>
      </div>
    </section>
  );
}

/**
 * The same grid without a heading, for the running-balance entry that opens
 * the sheet. Keeps the axis continuous with the bands below it.
 */
export function BandRaw({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="grid gap-x-6 gap-y-3 py-7 lg:grid-cols-[var(--axis)_1fr]">
        <div className="lg:pr-6">
          <h2 className="stamp-lg text-fg">{label}</h2>
        </div>
        <div className="min-w-0 lg:border-l lg:border-rule lg:pl-6">{children}</div>
      </div>
    </section>
  );
}

/** A ruled entry inside a band. Rows divide with hairlines, never with cards. */
export function LogRow({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-b border-rule py-3 last:border-b-0",
        interactive && "transition-colors duration-100 hover:bg-panel",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * A log entry with nothing in it yet. Left-aligned and ruled, because on this
 * product an empty sheet is the honest first run, not an error.
 */
export function EmptyEntry({ title, description }: { title: string; description?: string }) {
  return (
    <div className="py-5">
      <p className="stamp text-fg-muted">{title}</p>
      {description ? <p className="mt-2 max-w-md text-sm text-fg-subtle">{description}</p> : null}
    </div>
  );
}
