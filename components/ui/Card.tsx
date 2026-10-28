import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** A Navy Stream card: white on the gray page, large radius, barely-there shadow. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-ns-lg bg-ns-card p-4 shadow-ns-card sm:p-5", className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex items-center justify-between gap-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("ns-heading text-ns-ink", className)} {...props} />;
}

export function CardSubtitle({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("ns-label font-normal text-ns-ink-muted", className)} {...props} />;
}
