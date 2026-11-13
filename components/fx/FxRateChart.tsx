"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { formatRate, formatRateDate, FX_RANGE_DAYS, lastDays, sma, yearRange, type FxRange } from "@/lib/fx";
import type { FxBar } from "@/lib/types";

const MAX_POINTS = 520;

interface Point {
  date: string;
  rate: number;
  ma50: number | null;
  ma200: number | null;
}

function ChartTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as Point;
  return (
    <div className="rounded-ns-sm border border-ns-line bg-ns-card px-3 py-2 shadow-ns-card">
      <p className="ns-label text-ns-ink oc-num">{formatRate(p.rate)}</p>
      <p className="ns-caption mt-0.5 text-ns-ink-muted">{formatRateDate(p.date)}</p>
    </div>
  );
}

/**
 * Daily reference rate with its 50- and 200-day moving averages, the 52-week
 * band and the user's alert levels. Averages are worked out on the full history
 * before the range is cut, so they start at the left edge of a short range.
 */
export function FxRateChart({ bars, range, alertLevels }: { bars: FxBar[]; range: FxRange; alertLevels: number[] }) {
  const { points, band } = useMemo(() => {
    const rates = bars.map((b) => b.rate);
    const ma50 = sma(rates, 50);
    const ma200 = sma(rates, 200);
    const all: Point[] = bars.map((b, i) => ({ date: b.date, rate: b.rate, ma50: ma50[i], ma200: ma200[i] }));
    const from = lastDays(bars, FX_RANGE_DAYS[range])[0]?.date ?? "";
    let inRange = all.filter((p) => p.date >= from);
    if (inRange.length > MAX_POINTS) {
      const step = Math.ceil(inRange.length / MAX_POINTS);
      const last = inRange[inRange.length - 1];
      inRange = inRange.filter((_, i) => i % step === 0);
      if (inRange[inRange.length - 1] !== last) inRange.push(last);
    }
    return { points: inRange, band: yearRange(bars) };
  }, [bars, range]);

  const showMas = range !== "1M";
  const shortDates = range === "1M" || range === "6M";

  return (
    <div className="h-64 md:h-80" role="img" aria-label={`Rate chart, ${range}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          {band && (
            <ReferenceArea y1={band.low} y2={band.high} fill="var(--primary-soft)" fillOpacity={0.6} ifOverflow="hidden" />
          )}
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) =>
              new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", {
                timeZone: "UTC",
                ...(shortDates ? { day: "numeric", month: "short" } : { month: "short", year: "2-digit" }),
              })
            }
            minTickGap={36}
            stroke="var(--ink-subtle)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
            fontFamily="var(--font-sans)"
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => formatRate(v)}
            width={60}
            stroke="var(--ink-subtle)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            fontFamily="var(--font-sans)"
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--line)" }} />
          {alertLevels.map((level) => (
            <ReferenceLine key={level} y={level} stroke="var(--ink-muted)" strokeDasharray="4 4" ifOverflow="extendDomain" />
          ))}
          {showMas && (
            <Line dataKey="ma200" stroke="var(--ink-subtle)" strokeWidth={1.25} strokeDasharray="2 3" dot={false} isAnimationActive={false} connectNulls />
          )}
          {showMas && (
            <Line dataKey="ma50" stroke="var(--ocean-300)" strokeWidth={1.25} dot={false} isAnimationActive={false} connectNulls />
          )}
          <Line dataKey="rate" stroke="var(--primary)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** The chart's key: what each line and band means. */
export function FxChartLegend({ showMas }: { showMas: boolean }) {
  const item = (swatch: React.ReactNode, label: string) => (
    <span className="inline-flex items-center gap-1.5">
      {swatch}
      {label}
    </span>
  );
  return (
    <div className="ns-caption flex flex-wrap gap-x-4 gap-y-1 text-ns-ink-muted">
      {item(<span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-ns-primary" />, "Rate")}
      {showMas && item(<span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ background: "var(--ocean-300)" }} />, "50-day avg")}
      {showMas && item(<span aria-hidden="true" className="h-0 w-4 border-t border-dotted border-ns-ink-subtle" />, "200-day avg")}
      {item(<span aria-hidden="true" className="h-2.5 w-4 rounded-sm bg-ns-primary-soft" />, "52-week range")}
      {item(<span aria-hidden="true" className="h-0 w-4 border-t border-dashed border-ns-ink-muted" />, "Your alerts")}
    </div>
  );
}
