"use client";

import { useMemo, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Badge } from "@/components/ui/Badge";
import { FormField, inputClass, textareaClass } from "@/components/form/FormField";
import {
  ANALYSIS_ACTIONS,
  ANALYSIS_MARKETS,
  actionNeedsStock,
  buildAnalysisPrompt,
  type AnalysisAction,
  type AnalysisMarket,
} from "@/lib/analysisPrompt";

export function AnalysisRunner() {
  const [action, setAction] = useState<AnalysisAction>(ANALYSIS_ACTIONS[0]);
  const [market, setMarket] = useState<AnalysisMarket>(ANALYSIS_MARKETS[0]);
  const [stock, setStock] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const needsStock = actionNeedsStock(action);
  const canRun = !needsStock || stock.trim().length > 0;

  const prompt = useMemo(
    () => buildAnalysisPrompt({ action, market, stock: needsStock ? stock : "" }),
    [action, market, stock, needsStock]
  );

  async function handleRun() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState("copied");
    } catch {
      // Clipboard API blocked (permissions, insecure context, etc.) — fall back
      // to selecting the prompt text so the user can copy it manually.
      promptRef.current?.select();
      setCopyState("manual");
    }
    setTimeout(() => setCopyState("idle"), 2500);
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Run Analysis (Claude Skill)</CardTitle>
          <CardSubtitle>Builds a /stock-analysis prompt and copies it to your clipboard.</CardSubtitle>
        </div>
        <Badge tone="accent">In progress</Badge>
      </CardHeader>

      <div className="space-y-4">
        <FormField label="Action">
          <div className="-mx-1 overflow-x-auto px-1">
            <Segmented options={ANALYSIS_ACTIONS} value={action} onChange={setAction} size="sm" className="w-max" />
          </div>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Stock" hint={needsStock ? undefined : "Not needed for this action"}>
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value.toUpperCase())}
              placeholder="e.g. 005930, 7203, PTT"
              disabled={!needsStock}
              className={inputClass + " disabled:opacity-50"}
            />
          </FormField>

          <FormField label="Market">
            <select value={market} onChange={(e) => setMarket(e.target.value as AnalysisMarket)} className={inputClass}>
              {ANALYSIS_MARKETS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={handleRun} disabled={!canRun}>
            {copyState === "copied" ? "Copied!" : "Run Analysis (Claude Skill)"}
          </Button>
          {copyState === "manual" && (
            <span className="text-xs text-fg-muted">
              Clipboard blocked — text selected below, press ⌘/Ctrl+C to copy
            </span>
          )}
        </div>

        <FormField label="Prompt preview">
          <textarea
            ref={promptRef}
            readOnly
            value={prompt}
            rows={3}
            className={textareaClass + " resize-none"}
          />
        </FormField>
      </div>
    </Card>
  );
}
