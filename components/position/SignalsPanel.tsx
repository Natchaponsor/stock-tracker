"use client";

import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useHistory } from "@/hooks/useHistory";
import { useFundamentals } from "@/hooks/useFundamentals";
import { readSignal, readRsiSignal, readMacdSignal, readVolumeSignal, readPeSignal } from "@/lib/signal";
import type { SignalRead, SignalTone } from "@/lib/signal";

const toneToBadge: Record<SignalTone, "gain" | "loss" | "neutral"> = {
  good: "gain",
  bad: "loss",
  neutral: "neutral",
};

interface Row {
  key: string;
  name: string;
  signal: SignalRead;
}

function SignalRow({ row }: { row: Row }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{row.name}</span>
      <Badge tone={toneToBadge[row.signal.tone]}>{row.signal.label}</Badge>
    </div>
  );
}

/**
 * Every reading here is computed by real (already-tested) logic in lib/indicators.ts
 * and lib/signal.ts — it just has no data to work with yet, since /api/history and
 * /api/fundamentals have no provider wired up. The moment either does, these rows
 * light up with no further UI changes: hasEnoughData / null checks are what currently
 * render "Coming Soon!" and will just as naturally render real reads once data flows.
 */
export function SignalsPanel({ symbol }: { symbol: string }) {
  const { trend, hasEnoughData, latestRsi, macd, latestVolume, latestVolumeAvg } = useHistory(symbol);
  const { fundamentals } = useFundamentals(symbol);

  const rows: Row[] = [
    { key: "trend", name: "Trend", signal: readSignal(trend, hasEnoughData) },
    { key: "rsi", name: "RSI", signal: readRsiSignal(hasEnoughData ? latestRsi : null) },
    { key: "macd", name: "MACD", signal: readMacdSignal(hasEnoughData ? macd.histogram : null) },
    {
      key: "volume",
      name: "Volume",
      signal: readVolumeSignal(hasEnoughData ? latestVolume : null, hasEnoughData ? latestVolumeAvg : null),
    },
    { key: "pe", name: "Valuation", signal: readPeSignal(fundamentals?.peRatio ?? null) },
  ];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Signals</CardTitle>
          <CardSubtitle>Technical + fundamental reads for this position</CardSubtitle>
        </div>
      </CardHeader>
      <div className="flex flex-col">
        {rows.map((row) => (
          <SignalRow key={row.key} row={row} />
        ))}
      </div>
    </Card>
  );
}
