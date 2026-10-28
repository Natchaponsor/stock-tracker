import { cn } from "@/lib/cn";
import { glyph } from "@/lib/format";
import { usePositionStore } from "@/store/usePositionStore";

interface PnlTextProps {
  value: number;
  formatted: string;
  className?: string;
  showGlyph?: boolean;
}

export function PnlText({ value, formatted, className, showGlyph = true }: PnlTextProps) {
  const hidePnl = usePositionStore((s) => s.hidePnl);
  const tone = value > 0 ? "text-ns-success" : value < 0 ? "text-ns-danger" : "text-ns-ink-muted";

  return (
    <span className={cn("tabular-nums font-medium", tone, className)}>
      {showGlyph && <span aria-hidden="true">{glyph(value)} </span>}
      {hidePnl ? "••••" : formatted}
    </span>
  );
}
