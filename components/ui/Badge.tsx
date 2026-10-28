import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "gain" | "loss" | "accent";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ns-sunken text-ns-ink-muted",
  gain: "bg-ns-success-soft text-ns-success",
  loss: "bg-ns-danger-soft text-ns-danger",
  accent: "bg-ns-primary-soft text-ns-primary-text",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
