"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PnlText } from "@/components/ui/PnlText";
import { usePositionStore } from "@/store/usePositionStore";
import { computePositionMetrics } from "@/lib/positionMetrics";
import { formatCurrency, formatPct } from "@/lib/format";
import type { Position } from "@/lib/types";

export function ClosedPositionsTable({ positions }: { positions: Position[] }) {
  const strategies = usePositionStore((s) => s.strategies);

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Closed positions</CardTitle>
        </CardHeader>
        <EmptyState title="No closed positions yet" />
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 pt-5 sm:px-6">
        <CardHeader>
          <CardTitle>Closed positions</CardTitle>
        </CardHeader>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-fg-subtle">
              <th className="px-5 py-2.5 font-medium sm:px-6">Symbol</th>
              <th className="px-4 py-2.5 font-medium">Strategy</th>
              <th className="px-4 py-2.5 font-medium">Entry → exit</th>
              <th className="px-4 py-2.5 font-medium">Held</th>
              <th className="px-4 py-2.5 font-medium">Return</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {positions.map((p) => {
              const m = computePositionMetrics(p, null);
              const strategy = strategies.find((s) => s.id === p.strategyId);
              return (
                <tr key={p.id} className="hover:bg-panel/50 transition-colors">
                  <td className="px-5 py-2.5 font-medium text-fg sm:px-6">
                    <Link href={`/positions/${p.id}`}>{p.symbol}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-fg-muted whitespace-nowrap">{strategy?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 tabular-nums text-fg-muted whitespace-nowrap">
                    {formatCurrency(m.avgEntryPrice)} → {m.avgExitPrice !== null ? formatCurrency(m.avgExitPrice) : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-fg-muted whitespace-nowrap">
                    {m.daysHeld} days
                  </td>
                  <td className="px-4 py-2.5 tabular-nums whitespace-nowrap">
                    {m.totalPnl !== null && (
                      <PnlText
                        value={m.totalPnl}
                        formatted={`${formatCurrency(m.totalPnl, { signed: true })} · ${formatPct(m.returnPct ?? 0, { signed: true })}`}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-2.5 text-xs text-fg-subtle sm:px-6 border-t border-border">
        {format(new Date(), "MMM yyyy")} · {positions.length} closed
      </div>
    </Card>
  );
}
