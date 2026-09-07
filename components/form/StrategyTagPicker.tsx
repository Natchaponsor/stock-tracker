"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { inputClass } from "./FormField";
import { Button } from "@/components/ui/Button";
import type { Strategy } from "@/lib/types";

interface StrategyTagPickerProps {
  strategies: Strategy[];
  strategyIds: string[];
  customTags: string[];
  onChangeStrategyIds: (ids: string[]) => void;
  onChangeCustomTags: (tags: string[]) => void;
}

/**
 * "Strategy Notes" — multi-select of named Strategy records, plus free-text tags for
 * notes that aren't a formal strategy yet. Both render as removable pills, and both
 * end up on the position as tags shown in Outstanding Shares.
 */
export function StrategyTagPicker({
  strategies,
  strategyIds,
  customTags,
  onChangeStrategyIds,
  onChangeCustomTags,
}: StrategyTagPickerProps) {
  const [draftTag, setDraftTag] = useState("");

  const availableStrategies = strategies.filter((s) => !strategyIds.includes(s.id));

  function addCustomTag() {
    const trimmed = draftTag.trim();
    setDraftTag("");
    if (!trimmed || customTags.includes(trimmed)) return;
    onChangeCustomTags([...customTags, trimmed]);
  }

  return (
    <div className="space-y-2.5">
      {(strategyIds.length > 0 || customTags.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {strategyIds.map((id) => {
            const strategy = strategies.find((s) => s.id === id);
            if (!strategy) return null;
            return (
              <span
                key={id}
                className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[11px] text-accent"
              >
                {strategy.name}
                <button
                  type="button"
                  onClick={() => onChangeStrategyIds(strategyIds.filter((i) => i !== id))}
                  className="hover:text-fg"
                  title={`Remove ${strategy.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          {customTags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full border border-border bg-panel px-2.5 py-0.5 text-[11px] text-fg-subtle"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChangeCustomTags(customTags.filter((t) => t !== tag))}
                className="hover:text-fg"
                title={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {availableStrategies.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) onChangeStrategyIds([...strategyIds, e.target.value]);
            }}
            className={inputClass + " w-auto"}
          >
            <option value="">+ Add strategy</option>
            {availableStrategies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-1.5">
          <input
            value={draftTag}
            onChange={(e) => setDraftTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomTag();
              }
            }}
            placeholder="Other (free text)…"
            className={inputClass + " w-40"}
          />
          <Button type="button" variant="secondary" size="sm" onClick={addCustomTag}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
