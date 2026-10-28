"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePositionStore } from "@/store/usePositionStore";
import { SECTOR_SWATCHES, resolveSector } from "@/lib/sectors";
import { cn } from "@/lib/cn";
import type { CustomSector, SectorSwatch } from "@/lib/types";

const SWATCH_LABEL: Record<SectorSwatch, string> = {
  "cat-transport": "Indigo",
  "cat-food": "Orange",
  "cat-health": "Teal",
  "cat-shopping": "Green",
  "cat-bills": "Violet",
  "cat-fun": "Pink",
};

interface Draft {
  id: string | null;
  name: string;
  swatch: SectorSwatch;
  symbols: string[];
}

const EMPTY_DRAFT: Draft = { id: null, name: "", swatch: "cat-transport", symbols: [] };

/**
 * Create, edit and delete user-named sectors. A symbol assigned here shows
 * under that sector everywhere (allocation, symbol marks) instead of its
 * built-in one, and the sectors travel with Export / Import.
 */
export function SectorDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const customSectors = usePositionStore((s) => s.customSectors);
  const positions = usePositionStore((s) => s.positions);
  const watchlist = usePositionStore((s) => s.watchlist);
  const saveCustomSector = usePositionStore((s) => s.saveCustomSector);
  const deleteCustomSector = usePositionStore((s) => s.deleteCustomSector);

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [extraSymbols, setExtraSymbols] = useState<string[]>([]);
  const [symbolInput, setSymbolInput] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Every symbol the user has touched, held ones first, so picking needs no typing.
  const candidates = useMemo(() => {
    const held = positions.filter((p) => p.status === "open").map((p) => p.symbol);
    const rest = [
      ...positions.map((p) => p.symbol),
      ...watchlist.map((w) => w.symbol),
      ...customSectors.flatMap((c) => c.symbols),
      ...extraSymbols,
    ];
    return Array.from(new Set([...held, ...rest]));
  }, [positions, watchlist, customSectors, extraSymbols]);

  function reset() {
    setDraft(EMPTY_DRAFT);
    setSymbolInput("");
  }

  function close() {
    reset();
    setExtraSymbols([]);
    onClose();
  }

  function toggleSymbol(symbol: string) {
    setDraft((d) => ({
      ...d,
      symbols: d.symbols.includes(symbol) ? d.symbols.filter((s) => s !== symbol) : [...d.symbols, symbol],
    }));
  }

  function addTypedSymbol() {
    const symbol = symbolInput.trim().toUpperCase();
    if (!symbol) return;
    if (!candidates.includes(symbol)) setExtraSymbols((xs) => [...xs, symbol]);
    setDraft((d) => (d.symbols.includes(symbol) ? d : { ...d, symbols: [...d.symbols, symbol] }));
    setSymbolInput("");
  }

  function edit(sector: CustomSector) {
    setDraft({ id: sector.id, name: sector.name, swatch: sector.swatch, symbols: [...sector.symbols] });
  }

  function save() {
    const name = draft.name.trim();
    if (!name) return;
    saveCustomSector({
      id: draft.id ?? `sector-${Date.now()}`,
      name,
      swatch: draft.swatch,
      symbols: draft.symbols,
    });
    reset();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-50 bg-ns-ocean-900/50"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sector-dialog-title"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="fixed inset-x-3 top-[max(1rem,6vh)] bottom-4 z-50 mx-auto flex max-w-lg flex-col overflow-hidden rounded-ns-lg bg-ns-card shadow-ns-card sm:bottom-auto sm:max-h-[86vh]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-ns-line px-5 py-4">
              <h2 id="sector-dialog-title" className="ns-heading text-ns-ink">
                {draft.id ? "Edit sector" : "Assign new sector"}
              </h2>
              <button
                type="button"
                onClick={close}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ns-ink-muted hover:bg-ns-sunken hover:text-ns-ink"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  save();
                }}
                className="flex flex-col gap-4"
              >
                <div>
                  <label htmlFor="sector-name" className="oc-field-label">
                    Sector name
                  </label>
                  <input
                    id="sector-name"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="e.g. AI chips"
                    autoFocus
                    maxLength={40}
                    className="ns-body h-12 w-full rounded-ns-md border border-ns-line bg-ns-card px-3.5 text-ns-ink placeholder:text-ns-ink-subtle focus-visible:border-ns-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ns-primary-soft"
                  />
                </div>

                <fieldset>
                  <legend className="oc-field-label">Color</legend>
                  <div className="flex flex-wrap gap-2.5">
                    {SECTOR_SWATCHES.map((swatch) => {
                      const selected = draft.swatch === swatch;
                      return (
                        <button
                          key={swatch}
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, swatch }))}
                          aria-pressed={selected}
                          title={SWATCH_LABEL[swatch]}
                          className={cn(
                            "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ns-on-primary ring-offset-2 ring-offset-ns-card",
                            selected && "ring-2 ring-ns-primary"
                          )}
                          style={{ background: `var(--${swatch})` }}
                        >
                          {selected && <Check className="h-4 w-4" strokeWidth={2.5} />}
                          <span className="sr-only">{SWATCH_LABEL[swatch]}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="oc-field-label">Stocks in this sector</legend>
                  <div className="flex flex-wrap gap-2">
                    {candidates.map((symbol) => {
                      const selected = draft.symbols.includes(symbol);
                      const current = resolveSector(symbol, customSectors);
                      return (
                        <button
                          key={symbol}
                          type="button"
                          onClick={() => toggleSymbol(symbol)}
                          aria-pressed={selected}
                          className={cn(
                            "ns-label flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors",
                            selected
                              ? "border-ns-ocean-100 bg-ns-primary-soft text-ns-primary-text"
                              : "border-ns-line bg-ns-card text-ns-ink-muted hover:text-ns-ink"
                          )}
                        >
                          {selected && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                          {symbol}
                          <span className="sr-only">, now in</span>
                          <span className="ns-caption font-normal text-ns-ink-subtle">{current.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <input
                      value={symbolInput}
                      onChange={(e) => setSymbolInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTypedSymbol();
                        }
                      }}
                      placeholder="Another symbol"
                      aria-label="Add another symbol to this sector"
                      className="ns-body h-10 min-w-0 flex-1 rounded-ns-md border border-ns-line bg-ns-card px-3 text-ns-ink placeholder:text-ns-ink-subtle focus-visible:border-ns-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ns-primary-soft"
                    />
                    <Button type="button" variant="secondary" size="sm" className="h-10" onClick={addTypedSymbol}>
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  <p className="ns-caption mt-2 font-normal text-ns-ink-subtle">
                    A stock moves out of its old sector when you save. Remove the sector to send it back.
                  </p>
                </fieldset>

                <div className="flex justify-end gap-2">
                  {draft.id && (
                    <Button type="button" variant="ghost" size="sm" onClick={reset}>
                      Cancel edit
                    </Button>
                  )}
                  <Button type="submit" variant="primary" size="md" disabled={!draft.name.trim()}>
                    {draft.id ? "Save sector" : "Create sector"}
                  </Button>
                </div>
              </form>

              {customSectors.length > 0 && (
                <div className="mt-6 border-t border-ns-line pt-4">
                  <h3 className="ns-label text-ns-ink-muted">Your sectors</h3>
                  <ul className="mt-2 divide-y divide-ns-line">
                    {customSectors.map((sector) => (
                      <li key={sector.id} className="flex items-center gap-3 py-2.5">
                        <span
                          aria-hidden="true"
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ background: `var(--${sector.swatch})` }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="ns-body truncate font-semibold text-ns-ink">{sector.name}</p>
                          <p className="ns-caption truncate font-normal text-ns-ink-subtle">
                            {sector.symbols.length > 0 ? sector.symbols.join(", ") : "No stocks yet"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => edit(sector)}
                          title={`Edit ${sector.name}`}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ns-ink-subtle hover:bg-ns-sunken hover:text-ns-ink"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit {sector.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteCustomSector(sector.id);
                            if (draft.id === sector.id) reset();
                          }}
                          title={`Remove ${sector.name}`}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ns-ink-subtle hover:bg-ns-danger-soft hover:text-ns-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove {sector.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
