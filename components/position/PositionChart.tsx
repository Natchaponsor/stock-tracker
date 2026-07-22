"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useHistory } from "@/hooks/useHistory";
import { formatCurrency } from "@/lib/format";
import type { Fill } from "@/lib/types";

interface ChartPoint {
  date: string;
  price: number;
  emaFast: number;
  emaSlow: number;
}

function ChartTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as ChartPoint;
  return (
    <div className="rounded-lg border border-border bg-panel px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 text-fg-subtle">{format(new Date(String(label)), "MMM d, yyyy")}</p>
      <p className="flex items-center justify-between gap-4 text-fg">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-2.5 rounded bg-fg" />Price</span>
        <span className="tabular-nums font-semibold">{formatCurrency(point.price)}</span>
      </p>
      <p className="flex items-center justify-between gap-4 text-fg-muted">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-2.5 rounded bg-ema-fast" />EMA 50</span>
        <span className="tabular-nums">{formatCurrency(point.emaFast)}</span>
      </p>
      <p className="flex items-center justify-between gap-4 text-fg-muted">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-2.5 rounded bg-ema-slow" />EMA 200</span>
        <span className="tabular-nums">{formatCurrency(point.emaSlow)}</span>
      </p>
    </div>
  );
}

export function PositionChart({ symbol, entries }: { symbol: string; entries: Fill[] }) {
  const { bars, fast, slow, isLoading, hasError, hasEnoughData } = useHistory(symbol);

  const data = useMemo<ChartPoint[]>(
    () => bars.map((b, i) => ({ date: b.date, price: b.close, emaFast: fast[i], emaSlow: slow[i] })),
    [bars, fast, slow]
  );

  const entryDots = useMemo(
    () =>
      entries
        .map((e) => {
          const date = e.date.slice(0, 10);
          const idx = data.findIndex((d) => d.date >= date);
          return idx >= 0 ? { ...e, x: data[idx].date } : null;
        })
        .filter((v): v is Fill & { x: string } => v !== null),
    [entries, data]
  );

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Price &amp; trend</CardTitle>
          <CardSubtitle>Daily close with 50/200 EMA</CardSubtitle>
        </div>
      </CardHeader>

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : hasError || data.length === 0 ? (
        <EmptyState title="Price history unavailable" description="The market data proxy may be rate-limited — try again shortly." />
      ) : (
        <>
          <div className="mb-2 flex gap-4 text-xs text-fg-muted">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-fg" />Close</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-ema-fast" />EMA 50</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-ema-slow" />EMA 200</span>
          </div>
          {!hasEnoughData && (
            <p className="mb-2 text-xs text-fg-subtle">
              Still gathering history — the 200-EMA needs more daily bars to stabilize.
            </p>
          )}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 5" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => format(new Date(d), "MMM d")}
                  stroke="var(--color-fg-subtle)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={50}
                />
                <YAxis
                  domain={["dataMin - 2", "dataMax + 2"]}
                  tickFormatter={(v) => `$${v.toFixed(0)}`}
                  stroke="var(--color-fg-subtle)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-accent)", strokeWidth: 1 }} />
                <Line type="monotone" dataKey="emaSlow" stroke="var(--color-ema-slow)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="emaFast" stroke="var(--color-ema-fast)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="price" stroke="var(--color-fg)" strokeWidth={2} dot={false} isAnimationActive={false} />
                {entryDots.map((e) => (
                  <ReferenceDot
                    key={e.id}
                    x={e.x}
                    y={e.price}
                    r={5}
                    fill="var(--color-accent)"
                    stroke="var(--color-card)"
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  );
}
