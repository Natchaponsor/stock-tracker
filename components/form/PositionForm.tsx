"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, inputClass, textareaClass } from "./FormField";
import { usePositionStore } from "@/store/usePositionStore";
import { parseDateInputAsLocal, todayDateInputValue } from "@/lib/date";
import type { Position } from "@/lib/types";

interface PositionFormProps {
  existingPosition?: Position;
}

export function PositionForm({ existingPosition }: PositionFormProps) {
  const router = useRouter();
  const strategies = usePositionStore((s) => s.strategies);
  const addPosition = usePositionStore((s) => s.addPosition);
  const updatePosition = usePositionStore((s) => s.updatePosition);

  const [symbol, setSymbol] = useState(existingPosition?.symbol ?? "");
  const [strategyId, setStrategyId] = useState(existingPosition?.strategyId ?? strategies[0]?.id ?? "");
  const [thesis, setThesis] = useState(existingPosition?.thesis ?? "");
  const [stop, setStop] = useState(existingPosition?.stop?.toString() ?? "");
  const [target, setTarget] = useState(existingPosition?.target?.toString() ?? "");

  // only used when creating a brand new position
  const [entryPrice, setEntryPrice] = useState("");
  const [entryQty, setEntryQty] = useState("");
  const [entryDate, setEntryDate] = useState(todayDateInputValue());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedSymbol = symbol.trim().toUpperCase();
    if (!trimmedSymbol) return;

    const patch = {
      symbol: trimmedSymbol,
      strategyId: strategyId || null,
      thesis,
      stop: stop ? parseFloat(stop) : null,
      target: target ? parseFloat(target) : null,
    };

    if (existingPosition) {
      updatePosition(existingPosition.id, patch);
      router.push(`/positions/${existingPosition.id}`);
      return;
    }

    const price = parseFloat(entryPrice);
    const qty = parseFloat(entryQty);
    if (!Number.isFinite(price) || !Number.isFinite(qty) || qty <= 0) return;

    const id = `pos-${Date.now()}`;
    const now = new Date().toISOString();
    addPosition({
      id,
      status: "open",
      entries: [{ id: `fill-${Date.now()}`, date: parseDateInputAsLocal(entryDate).toISOString(), price, qty }],
      exits: [],
      notes: [],
      isSeed: false,
      createdAt: now,
      updatedAt: now,
      ...patch,
    });
    router.push(`/positions/${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{existingPosition ? "Position details" : "New position"}</CardTitle>
            <CardSubtitle>{existingPosition ? "Symbol, strategy, and plan" : "Symbol, strategy, and your first fill"}</CardSubtitle>
          </div>
        </CardHeader>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <FormField label="Symbol">
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className={inputClass}
              placeholder="AAPL"
              disabled={Boolean(existingPosition)}
            />
          </FormField>
          <FormField label="Strategy">
            <select value={strategyId} onChange={(e) => setStrategyId(e.target.value)} className={inputClass}>
              <option value="">None</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Stop (optional)">
            <input type="number" step="0.01" value={stop} onChange={(e) => setStop(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Target (optional)">
            <input type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} className={inputClass} />
          </FormField>
        </div>
        <div className="mt-4">
          <FormField label="Thesis">
            <textarea value={thesis} onChange={(e) => setThesis(e.target.value)} className={textareaClass} rows={3} />
          </FormField>
        </div>
      </Card>

      {!existingPosition && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>First fill</CardTitle>
              <CardSubtitle>Scale in further later from the position page</CardSubtitle>
            </div>
          </CardHeader>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <FormField label="Entry price">
              <input type="number" step="0.01" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Quantity">
              <input type="number" step="1" value={entryQty} onChange={(e) => setEntryQty(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Date">
              <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className={inputClass} />
            </FormField>
          </div>
        </Card>
      )}

      <Button type="submit" variant="primary">
        {existingPosition ? "Save changes" : "Log position"}
      </Button>
    </form>
  );
}
