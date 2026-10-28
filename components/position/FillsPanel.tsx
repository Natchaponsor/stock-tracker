"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fieldClass } from "@/components/form/FormField";
import { Segmented } from "@/components/ui/Segmented";
import { usePositionStore } from "@/store/usePositionStore";
import { formatCurrency } from "@/lib/format";
import { parseDateInputAsLocal, todayDateInputValue } from "@/lib/date";
import type { Position } from "@/lib/types";

const KINDS = ["entry", "exit"] as const;

export function FillsPanel({ position }: { position: Position }) {
  const addFill = usePositionStore((s) => s.addFill);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("entry");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(todayDateInputValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = parseFloat(price);
    const q = parseFloat(qty);
    if (!Number.isFinite(p) || !Number.isFinite(q) || q <= 0) return;
    addFill(position.id, kind, {
      id: `fill-${Date.now()}`,
      date: parseDateInputAsLocal(date).toISOString(),
      price: p,
      qty: q,
    });
    setPrice("");
    setQty("");
  }

  const allFills = [
    ...position.entries.map((f) => ({ ...f, kind: "entry" as const })),
    ...position.exits.map((f) => ({ ...f, kind: "exit" as const })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Fills</CardTitle>
          <CardSubtitle>Scale in or out — every buy and sell against this position</CardSubtitle>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap items-end gap-2">
        <Segmented options={KINDS} value={kind} onChange={setKind} size="sm" />
        <div className="flex flex-col gap-1">
          <label className="ns-label text-ns-ink-muted">Price</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={`h-10 w-24 px-2.5 ${fieldClass}`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="ns-label text-ns-ink-muted">Qty</label>
          <input
            type="number"
            step="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className={`h-10 w-20 px-2.5 ${fieldClass}`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="ns-label text-ns-ink-muted">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`h-10 px-2.5 ${fieldClass}`}
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Add {kind}
        </Button>
      </form>

      <ul className="divide-y divide-ns-line">
        {allFills.map((f) => (
          <li key={f.id} className="flex items-center justify-between py-2 text-sm">
            <span className={f.kind === "entry" ? "text-ns-success" : "text-ns-danger"}>
              {f.kind === "entry" ? "Bought" : "Sold"} {f.qty} sh
            </span>
            <span className="tabular-nums text-ns-ink-muted">{formatCurrency(f.price)}</span>
            <span className="tabular-nums text-ns-ink-subtle">{format(new Date(f.date), "MMM d, yyyy")}</span>
          </li>
        ))}
        {allFills.length === 0 && <li className="py-2 text-sm text-ns-ink-subtle">No fills yet.</li>}
      </ul>
    </Card>
  );
}
