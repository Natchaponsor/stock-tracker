import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * One setting: what it is on the left, its control on the right. In a narrow
 * card the control drops under the text.
 */
export function SettingRow({
  title,
  description,
  children,
  className,
  tone = "default",
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  tone?: "default" | "danger";
}) {
  return (
    // Sized by the card, not the screen: a narrow card stacks the control under the text.
    <div className={cn("@container border-t border-ns-line py-4 first:border-t-0 first:pt-0 last:pb-0", className)}>
      <div className="flex flex-col gap-3 @lg:flex-row @lg:items-center @lg:justify-between @lg:gap-6">
        <div className="min-w-0 flex-1">
          <p className={cn("ns-body font-medium", tone === "danger" ? "text-ns-danger" : "text-ns-ink")}>{title}</p>
          {description ? <div className="ns-label mt-0.5 max-w-xl font-normal text-ns-ink-muted">{description}</div> : null}
        </div>
        {children ? <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div> : null}
      </div>
    </div>
  );
}
