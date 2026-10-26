"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import type { TooltipContentProps } from "recharts";
import { EmptyEntry } from "@/components/log/Band";
import { usePositionStore } from "@/store/usePositionStore";
import { useQuotes } from "@/hooks/useQuotes";
import { computeCashSummary } from "@/lib/cash";
import { computeAllocation, type AllocationSlice } from "@/lib/portfolio";
import { formatCurrency } from "@/lib/format";

function AllocationTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload as AllocationSlice;
  return (
    <div className="border border-rule-strong bg-card px-3 py-2 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]">
      <p className="stamp text-fg">{slice.label}</p>
      <p className="fix-stamp mt-1 text-xs text-fg-muted">
        {formatCurrency(slice.value)} · {(slice.pct * 100).toFixed(1)}%
      </p>
    </div>
  );
}

/**
 * Allocation drawn as the sheet's scale bar: ruled ticks, squared ends, no pills.
 * Content only — it sits inside the "On the books" entry rather than being a band.
 */
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
  const chartHeight = Math.max(120, allocation.length * 42);

  return (
    <>
      {!hasAnything ? (
        <EmptyEntry
          title="Nothing to allocate"
          description="Set a cash balance or log a position and the scale bar fills in."
        />
      ) : (
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={allocation} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-rule)" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => `${Math.round(v * 100)}%`}
                domain={[0, "dataMax"]}
                stroke="var(--color-fg-subtle)"
                fontSize={11}
                tickLine={{ stroke: "var(--color-rule-strong)" }}
                axisLine={{ stroke: "var(--color-rule-strong)" }}
                fontFamily="var(--font-mono)"
              />
              <YAxis
                type="category"
                dataKey="label"
                stroke="var(--color-fg-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "var(--color-rule-strong)" }}
                width={72}
                fontFamily="var(--font-stamp)"
              />
              <Tooltip content={<AllocationTooltip />} cursor={{ fill: "var(--color-panel)" }} />
              <Bar dataKey="pct" radius={0} maxBarSize={18} isAnimationActive={false}>
                {allocation.map((slice) => (
                  <Cell
                    key={slice.label}
                    fill={slice.isCash ? "var(--color-plot-quiet)" : "var(--color-plot)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
