"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, inputClass, textareaClass } from "@/components/form/FormField";
import { usePositionStore } from "@/store/usePositionStore";
import { formatRate } from "@/lib/fx";
import { usePushState } from "@/components/fx/FxPushCard";
import type { FxAlert, FxPair } from "@/lib/types";

interface FxAlertDialogProps {
  open: boolean;
  pair: FxPair;
  /** Today's rate, to prefill the level and show beside it. */
  currentRate: number | null;
  /** The 52-week low and high, shown as context. */
  yearLow: number | null;
  yearHigh: number | null;
  /** Editing an existing alert; omitted for a new one. */
  alert?: FxAlert;
  onClose: () => void;
}

/** New or edited rate alert, as a bottom sheet on phones and a centred dialog on the web. */
export function FxAlertDialog(props: FxAlertDialogProps) {
  return (
    <AnimatePresence>
      {props.open && <FxAlertForm key={props.alert?.id ?? "new"} {...props} />}
    </AnimatePresence>
  );
}

function FxAlertForm({ pair, currentRate, yearLow, yearHigh, alert, onClose }: FxAlertDialogProps) {
  const addFxAlert = usePositionStore((s) => s.addFxAlert);
  const updateFxAlert = usePositionStore((s) => s.updateFxAlert);
  const push = usePushState();

  const [kind, setKind] = useState<"above" | "below">(alert?.condition.kind ?? "below");
  const [level, setLevel] = useState(
    alert ? String(alert.condition.level) : currentRate !== null ? formatRate(currentRate).replace(/,/g, "") : ""
  );
  const [repeat, setRepeat] = useState<FxAlert["repeat"]>(alert?.repeat ?? "once");
  const [note, setNote] = useState(alert?.note ?? "");

  const levelNumber = Number(level);
  const valid = level.trim() !== "" && Number.isFinite(levelNumber) && levelNumber > 0;
  const alreadyMet =
    valid && currentRate !== null && (kind === "above" ? currentRate >= levelNumber : currentRate <= levelNumber);

  function save() {
    if (!valid) return;
    const condition = { kind, level: levelNumber };
    const trimmed = note.trim() || undefined;
    if (alert) updateFxAlert(alert.id, { condition, repeat, note: trimmed });
    else addFxAlert({ id: crypto.randomUUID(), pair, condition, repeat, note: trimmed });
    onClose();
  }

  const seg = (value: string, label: string, pressed: boolean, onClick: () => void) => (
    <button key={value} type="button" aria-pressed={pressed} onClick={onClick}>
      {label}
    </button>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-ns-ocean-900/50"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fx-alert-title"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 400, damping: 34 }}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-ns-xl bg-ns-card p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-ns-card md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[440px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-ns-lg"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="fx-alert-title" className="ns-heading text-ns-ink">
            {alert ? "Edit alert" : "New alert"} · {pair}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ns-ink-muted hover:bg-ns-sunken hover:text-ns-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div>
            <span className="oc-field-label">When the rate goes</span>
            <div className="oc-seg">
              {seg("below", "Below", kind === "below", () => setKind("below"))}
              {seg("above", "Above", kind === "above", () => setKind("above"))}
            </div>
          </div>

          <FormField
            label="Level"
            hint={[
              currentRate !== null ? `Today ${formatRate(currentRate)}` : null,
              yearLow !== null && yearHigh !== null ? `52-week ${formatRate(yearLow)}–${formatRate(yearHigh)}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          >
            <input
              inputMode="decimal"
              value={level}
              onChange={(e) => setLevel(e.target.value.replace(/[^0-9.]/g, ""))}
              className={inputClass}
              autoFocus
            />
          </FormField>
          {alreadyMet && (
            <p className="ns-caption -mt-2 text-ns-ink-muted">
              Today&apos;s rate is already {kind} this level, so the alert fires on the next check.
            </p>
          )}

          <div>
            <span className="oc-field-label">Repeat</span>
            <div className="oc-seg">
              {seg("once", "Once", repeat === "once", () => setRepeat("once"))}
              {seg("rearm", "Every time", repeat === "rearm", () => setRepeat("rearm"))}
            </div>
            <p className="ns-caption mt-1.5 text-ns-ink-subtle">
              {repeat === "once"
                ? "Fires one time. Re-arm it from the pair page."
                : "Arms again after the rate moves back 0.5% past the level."}
            </p>
          </div>

          <FormField label="Note (optional)">
            <textarea
              rows={2}
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Convert ฿200k for the Q1 top-up"
              className={textareaClass}
            />
          </FormField>

          <p className="ns-caption text-ns-ink-muted">
            {push === "on" ? (
              "Push is on: this alert also reaches you when the app is closed (checked once a day)."
            ) : (
              <>
                Checked when you open the app.{" "}
                <Link href="/fx#push" onClick={onClose} className="oc-link">
                  Turn on push
                </Link>{" "}
                to hear about it while the app is closed.
              </>
            )}
          </p>

          <Button type="submit" variant="primary" className="w-full" disabled={!valid}>
            {alert ? "Save changes" : "Save alert"}
          </Button>
        </form>
      </motion.div>
    </>
  );
}
