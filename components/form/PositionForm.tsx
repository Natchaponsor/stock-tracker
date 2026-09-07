"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, inputClass, textareaClass } from "./FormField";
import { StrategyTagPicker } from "./StrategyTagPicker";
import { usePositionStore } from "@/store/usePositionStore";
import type { Position } from "@/lib/types";

interface PositionFormProps {
  existingPosition: Position;
}

export function PositionForm({ existingPosition }: PositionFormProps) {
  const router = useRouter();
  const strategies = usePositionStore((s) => s.strategies);
  const updatePosition = usePositionStore((s) => s.updatePosition);

  const [strategyIds, setStrategyIds] = useState<string[]>(existingPosition.strategyIds);
  const [customTags, setCustomTags] = useState<string[]>(existingPosition.customTags);
  const [thesis, setThesis] = useState(existingPosition.thesis);
  const [stop, setStop] = useState(existingPosition.stop?.toString() ?? "");
  const [target, setTarget] = useState(existingPosition.target?.toString() ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updatePosition(existingPosition.id, {
      strategyIds,
      customTags,
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
          <FormField label="Stop (optional)">
            <input type="number" step="0.01" value={stop} onChange={(e) => setStop(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Target (optional)">
            <input type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} className={inputClass} />
          </FormField>
        </div>
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
      </Card>

      <Button type="submit" variant="primary">
        Save changes
      </Button>
    </form>
  );
}
