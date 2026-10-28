"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import type { TooltipContentProps } from "recharts";
import { formatCurrency } from "@/lib/format";

interface PnlDatum {
  label: "Realized" | "Unrealized";
  value: number;
  emphasis: boolean;
}

function PnlTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload as PnlDatum;
  return (
    <div className="border border-ns-line bg-ns-card px-3 py-2 shadow-ns-card">
      <p className="ns-label text-ns-ink">{datum.label}</p>
      <p className="ns-caption mt-1 text-xs text-ns-ink-muted">{formatCurrency(datum.value, { signed: true })}</p>
    </div>
  );
}

/**
 * Realized vs. unrealized P&L as a small diverging bar chart. Realized is rendered at
 * full color and full weight; unrealized is deliberately muted (lower opacity, thinner
 * bar) so realized reads as the primary oc-num and unrealized as supporting context.
 */
export function PnlComparisonChart({ realized, unrealized }: { realized: number; unrealized: number | null }) {
  const data: PnlDatum[] = [
    { label: "Realized", value: realized, emphasis: true },
    { label: "Unrealized", value: unrealized ?? 0, emphasis: false },
  ];

  return (
    <div style={{ height: 108 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--line)" horizontal={false} />
          <ReferenceLine x={0} stroke="var(--line)" />
          <XAxis
            type="number"
            tickFormatter={(v) => formatCurrency(v)}
            stroke="var(--ink-subtle)"
            fontSize={11}
            tickLine={{ stroke: "var(--line)" }}
            axisLine={{ stroke: "var(--line)" }}
            fontFamily="var(--font-sans)"
          />
          <YAxis
            type="category"
            dataKey="label"
            stroke="var(--ink-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
            width={72}
            fontFamily="var(--font-sans)"
          />
          <Tooltip content={<PnlTooltip />} cursor={{ fill: "var(--surface-sunken)" }} />
          <Bar dataKey="value" radius={0} maxBarSize={18} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.label}
                fill={d.value >= 0 ? "var(--success)" : "var(--danger)"}
                fillOpacity={d.emphasis ? 1 : 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
