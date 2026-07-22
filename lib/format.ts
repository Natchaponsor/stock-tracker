export function formatCurrency(value: number, opts: { signed?: boolean } = {}): string {
  const { signed = false } = opts;
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: abs >= 1000 ? 0 : 2,
  });
  if (!signed) return value < 0 ? `-${formatted}` : formatted;
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

export function formatPct(value: number, opts: { signed?: boolean; decimals?: number } = {}): string {
  const { signed = false, decimals = 1 } = opts;
  const pct = value * 100;
  const formatted = `${Math.abs(pct).toFixed(decimals)}%`;
  if (!signed) return pct < 0 ? `-${formatted}` : formatted;
  if (pct > 0) return `+${formatted}`;
  if (pct < 0) return `-${formatted}`;
  return formatted;
}

export function formatR(value: number, opts: { signed?: boolean } = {}): string {
  const { signed = false } = opts;
  const formatted = `${Math.abs(value).toFixed(2)}R`;
  if (!signed) return value < 0 ? `-${formatted}` : formatted;
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function glyph(value: number): "▲" | "▼" | "•" {
  if (value > 0) return "▲";
  if (value < 0) return "▼";
  return "•";
}
