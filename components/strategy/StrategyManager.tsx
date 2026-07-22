"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField, inputClass, textareaClass } from "@/components/form/FormField";
import { usePositionStore } from "@/store/usePositionStore";
import { computeStrategyStats } from "@/lib/strategyStats";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Strategy } from "@/lib/types";

interface DraftFields {
  name: string;
  entryRule: string;
  exitRule: string;
}

const EMPTY_DRAFT: DraftFields = { name: "", entryRule: "", exitRule: "" };

function StrategyFormFields({
  draft,
  onChange,
}: {
  draft: DraftFields;
  onChange: (patch: Partial<DraftFields>) => void;
}) {
  return (
    <div className="space-y-3">
      <FormField label="Name">
        <input value={draft.name} onChange={(e) => onChange({ name: e.target.value })} className={inputClass} placeholder="Golden Cross Swing" />
      </FormField>
      <FormField label="Entry rule">
        <textarea value={draft.entryRule} onChange={(e) => onChange({ entryRule: e.target.value })} className={textareaClass} rows={2} />
      </FormField>
      <FormField label="Exit rule">
        <textarea value={draft.exitRule} onChange={(e) => onChange({ exitRule: e.target.value })} className={textareaClass} rows={2} />
      </FormField>
    </div>
  );
}

function StrategyRow({ strategy }: { strategy: Strategy }) {
  const positions = usePositionStore((s) => s.positions);
  const updateStrategy = usePositionStore((s) => s.updateStrategy);
  const deleteStrategy = usePositionStore((s) => s.deleteStrategy);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftFields>({
    name: strategy.name,
    entryRule: strategy.entryRule,
    exitRule: strategy.exitRule,
  });

  const stats = computeStrategyStats(strategy.id, positions);
  const inUse = stats.totalCount > 0;

  function save() {
    if (!draft.name.trim()) return;
    updateStrategy(strategy.id, draft);
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      {editing ? (
        <div className="space-y-3">
          <StrategyFormFields draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={save}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <p className="font-serif text-sm font-medium text-fg">{strategy.name}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setEditing(true)} className="rounded p-1 text-fg-subtle hover:text-fg" title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  if (inUse) {
                    alert(`Can't delete — ${stats.totalCount} position(s) use this strategy.`);
                    return;
                  }
                  if (confirm(`Delete "${strategy.name}"?`)) deleteStrategy(strategy.id);
                }}
                className="rounded p-1 text-fg-subtle hover:text-loss"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-fg-muted"><span className="text-fg-subtle">Entry: </span>{strategy.entryRule}</p>
          <p className="mt-1 text-xs text-fg-muted"><span className="text-fg-subtle">Exit: </span>{strategy.exitRule}</p>
          <div className="mt-3 flex gap-5">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-fg-subtle">Positions</p>
              <p className="text-sm font-semibold text-fg">{stats.totalCount}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-fg-subtle">Win rate</p>
              <p className="text-sm font-semibold text-fg">{stats.winRate !== null ? `${Math.round(stats.winRate * 100)}%` : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-fg-subtle">Avg return</p>
              <p className={cn("text-sm font-semibold", stats.avgReturnPct === null ? "text-fg-subtle" : stats.avgReturnPct >= 0 ? "text-gain" : "text-loss")}>
                {stats.avgReturnPct !== null ? formatPct(stats.avgReturnPct, { signed: true }) : "—"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function StrategyManager() {
  const strategies = usePositionStore((s) => s.strategies);
  const addStrategy = usePositionStore((s) => s.addStrategy);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftFields>(EMPTY_DRAFT);

  function handleAdd() {
    if (!draft.name.trim()) return;
    addStrategy({
      id: `strat-${Date.now()}`,
      name: draft.name.trim(),
      entryRule: draft.entryRule,
      exitRule: draft.exitRule,
      createdAt: new Date().toISOString(),
    });
    setDraft(EMPTY_DRAFT);
    setAdding(false);
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Strategies</CardTitle>
          <CardSubtitle>Rule sets you trade by, and how each is performing</CardSubtitle>
        </div>
        {!adding && (
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> New strategy
          </Button>
        )}
      </CardHeader>

      {adding && (
        <div className="mb-4 rounded-xl border border-accent/30 bg-panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">New strategy</p>
            <button onClick={() => setAdding(false)} className="text-fg-subtle hover:text-fg">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <StrategyFormFields draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
          <Button size="sm" variant="primary" className="mt-3" onClick={handleAdd}>
            Add strategy
          </Button>
        </div>
      )}

      {strategies.length === 0 && !adding ? (
        <EmptyState title="No strategies yet" description="Define a rule set so you can track how it performs over time." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {strategies.map((s) => (
            <StrategyRow key={s.id} strategy={s} />
          ))}
        </div>
      )}
    </Card>
  );
}
