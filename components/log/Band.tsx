import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { NsCard, NsEmpty } from "@/components/navy/primitives";

/**
 * A titled section, drawn as a Navy Stream card. Kept under its old name so
 * pages that grew up on the deck log (Disclosures) keep their structure.
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
    <NsCard title={title} meta={meta} action={action} className={cn("mt-3", className)}>
      <div className={cn("min-w-0", contentClassName)}>{children}</div>
    </NsCard>
  );
}

/** The opening section of a page: a card whose heading is the page's label. */
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
    <section className={cn("oc-card", className)}>
      <h2 className="ns-title text-ns-ink">{label}</h2>
      <div className="mt-3 min-w-0">{children}</div>
    </section>
  );
}

/** A row inside a section, divided from the next by a hairline. */
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
        "border-b border-ns-line py-3 last:border-b-0",
        interactive && "-mx-2 rounded-ns-md px-2 transition-colors duration-100 hover:bg-ns-sunken",
        className
      )}
    >
      {children}
    </div>
  );
}

/** A section with nothing in it yet. */
export function EmptyEntry({ title, description }: { title: string; description?: string }) {
  return <NsEmpty title={title} description={description} />;
}
