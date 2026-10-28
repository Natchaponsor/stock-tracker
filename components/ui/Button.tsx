import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/* Navy Stream buttons: pill-shaped, primary is the blue fade with its glow. */
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-linear-to-r from-ns-ocean-400 to-ns-primary text-ns-on-primary shadow-ns-primary active:bg-ns-ocean-700 active:bg-none",
  secondary: "bg-ns-primary-soft text-ns-primary-text hover:bg-ns-ocean-100",
  ghost: "bg-transparent text-ns-ink-muted hover:text-ns-ink hover:bg-ns-sunken",
  danger: "bg-ns-danger-soft text-ns-danger hover:brightness-95",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5",
  md: "h-11 px-5 text-[15px] gap-2",
};

export function Button({ className, variant = "secondary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-full font-semibold transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ns-primary",
        "disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}
