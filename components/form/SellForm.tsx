"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, inputClass } from "./FormField";
import { usePositionStore } from "@/store/usePositionStore";
import { computePositionMetrics } from "@/lib/positionMetrics";
import { allocateFifoSell } from "@/lib/portfolio";
import { parseDateInputAsLocal, todayDateInputValue } from "@/lib/date";

export function SellForm() {
  const router = useRouter();
  const positions = usePositionStore((s) => s.positions);
  const addFill = usePositionStore((s) => s.addFill);
  const closePosition = usePositionStore((s) => s.closePosition);

  // Grouped by symbol, not by individual position — the user picks what to sell,
  // not which lot; a sell is allocated across open lots oldest-first (FIFO).
  const bySymbol = useMemo(() => {
    const groups = new Map<string, typeof positions>();
    for (const p of positions) {
      if (p.status !== "open") continue;
      if (computePositionMetrics(p, null).openQty <= 0) continue;
      const list = groups.get(p.symbol) ?? [];
      list.push(p);
      groups.set(p.symbol, list);
    }
    return Array.from(groups.entries())
      .map(([symbol, lots]) => ({
        symbol,
        lots,
        openQty: lots.reduce((a, p) => a + computePositionMetrics(p, null).openQty, 0),
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [positions]);

  const [symbol, setSymbol] = useState(bySymbol[0]?.symbol ?? "");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(todayDateInputValue());
  const [error, setError] = useState<string | null>(null);

  const selected = bySymbol.find((g) => g.symbol === symbol);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selected) return;

    const p = parseFloat(price);
    const q = parseFloat(qty);
    if (!Number.isFinite(p) || !Number.isFinite(q) || q <= 0) return;

    const allocations = allocateFifoSell(selected.lots, q);
    if (!allocations) {
      setError(`You only hold ${selected.openQty} shares of ${selected.symbol}.`);
      return;
    }

    const fillDate = parseDateInputAsLocal(date).toISOString();
    allocations.forEach((alloc, i) => {
      addFill(alloc.positionId, "exit", {
        id: `fill-${Date.now()}-${i}`,
        date: fillDate,
        price: p,
        qty: alloc.qty,
      });
      if (alloc.willFullyClose) closePosition(alloc.positionId);
    });

    router.push(`/positions/${allocations[allocations.length - 1].positionId}`);
  }

  if (bySymbol.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Sell shares</CardTitle>
            <CardSubtitle>You don&apos;t hold any outstanding shares to sell right now.</CardSubtitle>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Sell shares</CardTitle>
            <CardSubtitle>
              Sell all or part of a holding you currently have open — oldest shares sell first (FIFO)
            </CardSubtitle>
          </div>
        </CardHeader>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <FormField label="Symbol">
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className={inputClass}>
              {bySymbol.map((g) => (
                <option key={g.symbol} value={g.symbol}>
                  {g.symbol} — {g.openQty} sh open
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Price">
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Quantity" hint={selected ? `Max ${selected.openQty} sh` : undefined}>
            <input type="number" step="1" value={qty} onChange={(e) => setQty(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </FormField>
        </div>
        {error && <p className="mt-3 text-sm text-loss">{error}</p>}
      </Card>

      <Button type="submit" variant="primary">
        Sell shares
      </Button>
    </form>
  );
}
