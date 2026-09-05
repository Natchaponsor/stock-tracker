"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, inputClass, textareaClass } from "./FormField";
import { usePositionStore } from "@/store/usePositionStore";
import type { Position } from "@/lib/types";

interface PositionFormProps {
  existingPosition: Position;
}

export function PositionForm({ existingPosition }: PositionFormProps) {
  const router = useRouter();
  const strategies = usePositionStore((s) => s.strategies);
  const updatePosition = usePositionStore((s) => s.updatePosition);

  const [strategyId, setStrategyId] = useState(existingPosition.strategyId ?? "");
  const [thesis, setThesis] = useState(existingPosition.thesis);
  const [stop, setStop] = useState(existingPosition.stop?.toString() ?? "");
  const [target, setTarget] = useState(existingPosition.target?.toString() ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updatePosition(existingPosition.id, {
      strategyId: strategyId || null,
      thesis,
      stop: stop ? parseFloat(stop) : null,
      target: target ? parseFloat(target) : null,
    });
    router.push(`/positions/${existingPosition.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Position details</CardTitle>
            <CardSubtitle>Symbol, strategy, and plan</CardSubtitle>
          </div>
        </CardHeader>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <FormField label="Symbol">
            <input value={existingPosition.symbol} className={inputClass} disabled />
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

      <Button type="submit" variant="primary">
        Save changes
      </Button>
    </form>
  );
}
