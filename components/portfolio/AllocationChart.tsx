"use client";

import { useMemo, useState } from "react";
import { Cpu, Flame, HeartPulse, Landmark, Plus, Radio, Shapes, ShoppingBag, Tag, Wallet, type LucideIcon } from "lucide-react";
import { NsCard, NsEmpty } from "@/components/navy/primitives";
import { Button } from "@/components/ui/Button";
import { SectorDialog } from "@/components/portfolio/SectorDialog";
import { usePositionStore } from "@/store/usePositionStore";
import { useQuotes } from "@/hooks/useQuotes";
import { computeCashSummary } from "@/lib/cash";
import { computeAllocation } from "@/lib/portfolio";
import { formatCurrency } from "@/lib/format";
import { resolveSector, type Sector } from "@/lib/sectors";

const SECTOR_ICON: Record<Sector, LucideIcon> = {
  Technology: Cpu,
  Energy: Flame,
  Healthcare: HeartPulse,
  Consumer: ShoppingBag,
  Financials: Landmark,
  Communication: Radio,
  Other: Shapes,
};

interface Row {
  key: string;
  label: string;
  symbols: string[];
  value: number;
  pct: number;
  color: string;
  Icon: LucideIcon;
}

/**
 * Where the money sits, grouped by sector. Each row is a Navy Stream category
 * row: the sector's colour on its icon and bar, the name beside it, and the
 * bars scaled against the largest row so the list reads like a bar chart.
 * Cash is its own row in the brand blue. Sectors the user named themselves
 * (Assign new sector) take their symbols out of the built-in ones.
 */
export function AllocationChart() {
  const startingCash = usePositionStore((s) => s.startingCash);
  const positions = usePositionStore((s) => s.positions);
  const hidePnl = usePositionStore((s) => s.hidePnl);
  const customSectors = usePositionStore((s) => s.customSectors);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openSymbols = useMemo(
    () => Array.from(new Set(positions.filter((p) => p.status === "open").map((p) => p.symbol))),
    [positions]
  );
  const { quotes } = useQuotes(openSymbols);

  const cash = useMemo(() => computeCashSummary(startingCash, positions).cash, [startingCash, positions]);

  const rows = useMemo(() => {
    const slices = computeAllocation(cash, positions, quotes);
    const bySector = new Map<string, Row>();
    const out: Row[] = [];

    for (const slice of slices) {
      if (slice.isCash) {
        out.push({ key: "cash", label: "Cash", symbols: [], value: slice.value, pct: slice.pct, color: "var(--primary)", Icon: Wallet });
        continue;
      }
      const sector = resolveSector(slice.label, customSectors);
      const row = bySector.get(sector.key);
      if (row) {
        row.value += slice.value;
        row.pct += slice.pct;
        row.symbols.push(slice.label);
      } else {
        bySector.set(sector.key, {
          key: sector.key,
          label: sector.name,
          symbols: [slice.label],
          value: slice.value,
          pct: slice.pct,
          color: sector.color,
          Icon: sector.builtIn ? SECTOR_ICON[sector.builtIn] : Tag,
        });
      }
    }

    return [...out, ...bySector.values()].sort((a, b) => b.value - a.value);
  }, [cash, positions, quotes, customSectors]);

  const hasAnything = rows.some((r) => r.value !== 0);
  const largest = Math.max(...rows.map((r) => Math.abs(r.value)), 1);

  return (
    <NsCard
      title="Allocation by sector"
      meta="Cash + open positions"
      action={
        <Button variant="secondary" size="sm" onClick={() => setDialogOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4" />
          Assign new sector
        </Button>
      }
    >
      <SectorDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      {!hasAnything ? (
        <NsEmpty
          title="Nothing to allocate"
          description="Set a cash balance or log a position and the breakdown fills in."
        />
      ) : (
        <ul className="flex flex-col gap-3.5">
          {rows.map((row) => (
            <li key={row.key} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3">
              <span className="oc-cat-icon" style={{ background: row.color }} aria-hidden="true">
                <row.Icon className="h-[15px] w-[15px]" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="ns-body truncate text-ns-ink">
                    {row.label}
                    {row.symbols.length > 0 && (
                      <span className="ns-caption ml-2 font-normal text-ns-ink-subtle">{row.symbols.join(", ")}</span>
                    )}
                  </p>
                  <p className="ns-label oc-num shrink-0 text-ns-ink-muted">{(row.pct * 100).toFixed(1)}%</p>
                </div>
                <div className="oc-track mt-1.5 h-1.5!">
                  <div
                    className="oc-fill"
                    style={{ width: `${Math.max(2, (Math.abs(row.value) / largest) * 100)}%`, background: row.color }}
                  />
                </div>
              </div>
              <p className="ns-body oc-num w-[5.5rem] text-right font-semibold text-ns-ink">
                {hidePnl ? "••••" : formatCurrency(row.value)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </NsCard>
  );
}
