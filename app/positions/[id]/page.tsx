"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { useHydrated } from "@/hooks/useHydrated";
import { useQuotes } from "@/hooks/useQuotes";
import { useHistory } from "@/hooks/useHistory";
import { usePositionStore } from "@/store/usePositionStore";
import { computePositionMetrics } from "@/lib/positionMetrics";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PnlText } from "@/components/ui/PnlText";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { PositionChart } from "@/components/position/PositionChart";
import { PositionMetricsGrid } from "@/components/position/PositionMetricsGrid";
import { FillsPanel } from "@/components/position/FillsPanel";
import { JournalTimeline } from "@/components/position/JournalTimeline";

export default function PositionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useHydrated();
  const positions = usePositionStore((s) => s.positions);
  const strategies = usePositionStore((s) => s.strategies);
  const deletePosition = usePositionStore((s) => s.deletePosition);
  const closePosition = usePositionStore((s) => s.closePosition);

  const position = positions.find((p) => p.id === params.id);

  const { quotes } = useQuotes(position ? [position.symbol] : []);
  const quote = position ? quotes.get(position.symbol) : undefined;
  const { trend, hasEnoughData } = useHistory(position?.symbol ?? null);

  const metrics = useMemo(
    () => (position ? computePositionMetrics(position, quote?.price ?? null) : null),
    [position, quote]
  );

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!position || !metrics) {
    return (
      <EmptyState
        title="Position not found"
        action={
          <Link href="/">
            <Button>Back to dashboard</Button>
          </Link>
        }
      />
    );
  }

  const strategy = strategies.find((s) => s.id === position.strategyId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-medium text-fg">{position.symbol}</h1>
          <Badge tone={position.status === "open" ? "gain" : "neutral"} className="uppercase">
            {position.status}
          </Badge>
          {strategy && <Badge tone="accent">{strategy.name}</Badge>}
          {metrics.totalPnl !== null && (
            <PnlText value={metrics.totalPnl} formatted={formatCurrency(metrics.totalPnl, { signed: true })} className="text-lg" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {position.status === "open" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (confirm("Mark this position as closed?")) closePosition(position.id);
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Close position
            </Button>
          )}
          <Link href={`/positions/${position.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm("Delete this position? This cannot be undone.")) {
                deletePosition(position.id);
                router.push("/");
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      <PositionMetricsGrid metrics={metrics} trend={trend} hasEnoughData={hasEnoughData} />

      {position.thesis && (
        <Card>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">Thesis</p>
          <p className="text-sm leading-relaxed text-fg-muted">{position.thesis}</p>
        </Card>
      )}

      <PositionChart symbol={position.symbol} entries={position.entries} />

      <FillsPanel position={position} />

      <JournalTimeline position={position} />
    </div>
  );
}
