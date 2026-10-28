import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-ns-sm bg-ns-sunken", className)}
      aria-hidden="true"
    />
  );
}
