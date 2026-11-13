"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { NsCard } from "@/components/navy/primitives";
import { CurrencySelect } from "@/components/fx/FxBits";
import { inputClass } from "@/components/form/FormField";
import { useFxLatest } from "@/hooks/useFx";
import { formatMoney, formatRate, formatRateDate, makePair } from "@/lib/fx";

/** Converts at the latest daily reference rate, always showing that rate and its date. */
export function FxConverter({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const [amount, setAmount] = useState("1000");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const pair = makePair(from, to);
  const { rates, isLoading, hasError } = useFxLatest(pair ? [pair] : []);
  const latest = pair ? rates?.[pair] : undefined;
  const value = Number(amount.replace(/,/g, ""));
  const converted = latest && Number.isFinite(value) ? value * latest.rate : null;

  return (
    <NsCard title="Convert" meta="At the daily reference rate, before any bank spread">
      <div className="space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2">
          <input
            aria-label="Amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
            className={inputClass}
          />
          <CurrencySelect label="From currency" value={from} onChange={setFrom} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            aria-label="Swap currencies"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ns-primary-soft text-ns-primary-text"
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <CurrencySelect label="To currency" value={to} onChange={setTo} />
        </div>
        <div className="rounded-ns-md bg-ns-sunken px-4 py-3">
          <p className="ns-amount-md oc-num text-ns-ink">
            {!pair ? "Pick two currencies" : converted !== null ? formatMoney(converted, to) : isLoading ? "…" : "—"}
          </p>
          <p className="ns-caption mt-1 text-ns-ink-muted">
            {latest
              ? `1 ${from} = ${formatRate(latest.rate)} ${to} · reference rate, ${formatRateDate(latest.date)}`
              : hasError
                ? "Rates are unavailable right now."
                : " "}
          </p>
        </div>
      </div>
    </NsCard>
  );
}
