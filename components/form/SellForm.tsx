"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, inputClass } from "./FormField";
import { usePositionStore } from "@/store/usePositionStore";
import { computePositionMetrics } from "@/lib/positionMetrics";
import { parseDateInputAsLocal, todayDateInputValue } from "@/lib/date";

export function SellForm() {
  const router = useRouter();
  const positions = usePositionStore((s) => s.positions);
  const addFill = usePositionStore((s) => s.addFill);
  const closePosition = usePositionStore((s) => s.closePosition);

  const openPositions = useMemo(
    () =>
      positions
        .filter((p) => p.status === "open")
        .map((p) => ({ position: p, openQty: computePositionMetrics(p, null).openQty }))
        .filter((p) => p.openQty > 0)
        .sort((a, b) => a.position.symbol.localeCompare(b.position.symbol)),
    [positions]
  );

  const [positionId, setPositionId] = useState(openPositions[0]?.position.id ?? "");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(todayDateInputValue());
  const [error, setError] = useState<string | null>(null);

  const selected = openPositions.find((p) => p.position.id === positionId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selected) return;

    const p = parseFloat(price);
    const q = parseFloat(qty);
    if (!Number.isFinite(p) || !Number.isFinite(q) || q <= 0) return;
    if (q > selected.openQty) {
      setError(`You only hold ${selected.openQty} shares of ${selected.position.symbol}.`);
      return;
    }

    addFill(selected.position.id, "exit", {
      id: `fill-${Date.now()}`,
      date: parseDateInputAsLocal(date).toISOString(),
      price: p,
      qty: q,
    });
    if (q === selected.openQty) closePosition(selected.position.id);
    router.push(`/positions/${selected.position.id}`);
  }

  if (openPositions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Sell shares</CardTitle>
            <CardSubtitle>You don&apos;t hold any open positions to sell right now.</CardSubtitle>
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
            <CardSubtitle>Sell all or part of a holding you currently have open</CardSubtitle>
          </div>
        </CardHeader>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <FormField label="Symbol">
            <select value={positionId} onChange={(e) => setPositionId(e.target.value)} className={inputClass}>
              {openPositions.map(({ position, openQty }) => (
                <option key={position.id} value={position.id}>
                  {position.symbol} — {openQty} sh open
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
