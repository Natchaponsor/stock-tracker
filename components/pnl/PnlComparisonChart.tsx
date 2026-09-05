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
    <div className="rounded-lg border border-border bg-panel px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-fg">{datum.label}</p>
      <p className="tabular-nums text-fg-muted">{formatCurrency(datum.value, { signed: true })}</p>
    </div>
  );
}

/**
 * Realized vs. unrealized P&L as a small diverging bar chart. Realized is rendered at
 * full color and full weight; unrealized is deliberately muted (lower opacity, thinner
 * bar) so realized reads as the primary figure and unrealized as supporting context.
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
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 5" horizontal={false} />
          <ReferenceLine x={0} stroke="var(--color-fg-subtle)" />
          <XAxis
            type="number"
            tickFormatter={(v) => formatCurrency(v)}
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
            width={72}
          />
          <Tooltip content={<PnlTooltip />} cursor={{ fill: "var(--color-panel)" }} />
          <Bar dataKey="value" radius={4} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.label}
                fill={d.value >= 0 ? "var(--color-gain)" : "var(--color-loss)"}
                fillOpacity={d.emphasis ? 1 : 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
