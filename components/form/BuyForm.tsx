"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, inputClass, textareaClass } from "./FormField";
import { StrategyTagPicker } from "./StrategyTagPicker";
import { usePositionStore } from "@/store/usePositionStore";
import { parseDateInputAsLocal, todayDateInputValue } from "@/lib/date";

export function BuyForm() {
  const router = useRouter();
  const positions = usePositionStore((s) => s.positions);
  const strategies = usePositionStore((s) => s.strategies);
  const addPosition = usePositionStore((s) => s.addPosition);
  const addFill = usePositionStore((s) => s.addFill);

  const [symbol, setSymbol] = useState("");
  const [strategyIds, setStrategyIds] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [thesis, setThesis] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");

  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(todayDateInputValue());

  const trimmedSymbol = symbol.trim().toUpperCase();
  const existingOpen = useMemo(
    () => positions.find((p) => p.symbol === trimmedSymbol && p.status === "open"),
    [positions, trimmedSymbol]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmedSymbol) return;

    const p = parseFloat(price);
    const q = parseFloat(qty);
    if (!Number.isFinite(p) || !Number.isFinite(q) || q <= 0) return;

    const fill = { id: `fill-${Date.now()}`, date: parseDateInputAsLocal(date).toISOString(), price: p, qty: q };

    if (existingOpen) {
      addFill(existingOpen.id, "entry", fill);
      router.push(`/positions/${existingOpen.id}`);
      return;
    }

    const id = `pos-${Date.now()}`;
    const now = new Date().toISOString();
    addPosition({
      id,
      symbol: trimmedSymbol,
      status: "open",
      strategyIds,
      customTags,
      thesis,
      stop: stop ? parseFloat(stop) : null,
      target: target ? parseFloat(target) : null,
      entries: [fill],
      exits: [],
      notes: [],
      isSeed: false,
      createdAt: now,
      updatedAt: now,
    });
    router.push(`/positions/${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Buy shares</CardTitle>
            <CardSubtitle>
              {existingOpen
                ? `Adds to your existing open ${trimmedSymbol} position`
                : "New symbol, strategy, and plan"}
            </CardSubtitle>
          </div>
        </CardHeader>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <FormField label="Symbol">
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className={inputClass}
              placeholder="AAPL"
            />
          </FormField>
          {!existingOpen && (
            <>
              <FormField label="Stop (optional)">
                <input type="number" step="0.01" value={stop} onChange={(e) => setStop(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Target (optional)">
                <input type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} className={inputClass} />
              </FormField>
            </>
          )}
        </div>
        {!existingOpen && (
          <div className="mt-4 space-y-4">
            <FormField label="Strategy Notes">
              <StrategyTagPicker
                strategies={strategies}
                strategyIds={strategyIds}
                customTags={customTags}
                onChangeStrategyIds={setStrategyIds}
                onChangeCustomTags={setCustomTags}
              />
            </FormField>
            <FormField label="Thesis">
              <textarea value={thesis} onChange={(e) => setThesis(e.target.value)} className={textareaClass} rows={3} />
            </FormField>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Fill</CardTitle>
            <CardSubtitle>The buy execution — price, quantity, and date</CardSubtitle>
          </div>
        </CardHeader>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <FormField label="Price">
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Quantity">
            <input type="number" step="1" value={qty} onChange={(e) => setQty(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </FormField>
        </div>
      </Card>

      <Button type="submit" variant="primary">
        Buy shares
      </Button>
    </form>
  );
}
