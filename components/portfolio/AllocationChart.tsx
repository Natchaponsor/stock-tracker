"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import type { TooltipContentProps } from "recharts";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePositionStore } from "@/store/usePositionStore";
import { useQuotes } from "@/hooks/useQuotes";
import { computeCashSummary } from "@/lib/cash";
import { computeAllocation, type AllocationSlice } from "@/lib/portfolio";
import { formatCurrency } from "@/lib/format";

function AllocationTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload as AllocationSlice;
  return (
    <div className="rounded-lg border border-border bg-panel px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-fg">{slice.label}</p>
      <p className="tabular-nums text-fg-muted">
        {formatCurrency(slice.value)} · {(slice.pct * 100).toFixed(1)}%
      </p>
    </div>
  );
}

export function AllocationChart() {
  const startingCash = usePositionStore((s) => s.startingCash);
  const positions = usePositionStore((s) => s.positions);

  const openSymbols = useMemo(
    () => Array.from(new Set(positions.filter((p) => p.status === "open").map((p) => p.symbol))),
    [positions]
  );
  const { quotes } = useQuotes(openSymbols);

  const cash = useMemo(() => computeCashSummary(startingCash, positions).cash, [startingCash, positions]);
  const allocation = useMemo(() => computeAllocation(cash, positions, quotes), [cash, positions, quotes]);

  const hasAnything = allocation.some((s) => s.value !== 0);
  const chartHeight = Math.max(120, allocation.length * 44);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Portfolio Allocation</CardTitle>
          <CardSubtitle>Distribution across cash and open positions</CardSubtitle>
        </div>
      </CardHeader>
      {!hasAnything ? (
        <EmptyState title="Nothing to allocate yet" description="Add cash or log a position to see the breakdown." />
      ) : (
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={allocation} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 5" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => `${Math.round(v * 100)}%`}
                domain={[0, "dataMax"]}
                stroke="var(--color-fg-subtle)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                stroke="var(--color-fg-subtle)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip content={<AllocationTooltip />} cursor={{ fill: "var(--color-panel)" }} />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
                {allocation.map((slice) => (
                  <Cell key={slice.label} fill={slice.isCash ? "var(--color-gain)" : "var(--color-accent)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
