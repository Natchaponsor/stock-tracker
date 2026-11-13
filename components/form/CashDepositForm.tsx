"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Card, CardHeader, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InfoTip } from "@/components/ui/InfoTip";
import { CurrencySelect } from "@/components/fx/FxBits";
import { FormField, fieldClass, inputClass, textareaClass } from "./FormField";
import { usePositionStore } from "@/store/usePositionStore";
import { useFxRateOn } from "@/hooks/useFx";
import { depositUsd } from "@/lib/cash";
import { formatMoney, formatRate, formatRateDate, makePair } from "@/lib/fx";
import { formatCurrency } from "@/lib/format";
import { parseDateInputAsLocal, todayDateInputValue } from "@/lib/date";
import { cn } from "@/lib/cn";

/** An entered rate this far from the reference rate is probably upside down or mistyped. */
const RATE_WARN_GAP = 0.1;

/** A new deposit's id: time-ordered, with a random tail so two devices never collide. */
const newDepositId = () => `cash-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const parseNumber = (text: string) => {
  const n = Number(text.replace(/,/g, "").trim());
  return text.trim() === "" || !Number.isFinite(n) ? null : n;
};

/**
 * Log cash put into the portfolio. Any currency: a non-dollar amount converts
 * at the rate the user enters, or, left blank, at the daily reference rate for
 * the day the cash went in. The rate is saved with the deposit, so the dollar
 * figure never moves afterwards.
 */
export function CashDepositForm() {
  const router = useRouter();
  const home = usePositionStore((s) => s.homeCurrency);
  const addCashDeposit = usePositionStore((s) => s.addCashDeposit);

  const today = todayDateInputValue();
  const [currency, setCurrency] = useState(home);
  const [amountText, setAmountText] = useState("");
  const [date, setDate] = useState(today);
  const [rateText, setRateText] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isUsd = currency === "USD";
  const amount = parseNumber(amountText);
  const enteredRate = parseNumber(rateText);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today;

  // The reference rate for the day: the default when the rate is left blank,
  // and a check on a rate the user typed.
  const pair = isUsd ? null : makePair("USD", currency);
  const reference = useFxRateOn(pair, validDate ? date : null);
  const usingReference = !isUsd && rateText.trim() === "";
  const rate = isUsd ? 1 : usingReference ? (reference.fix?.rate ?? null) : enteredRate;

  const amountError = amount === null ? "Enter an amount." : amount <= 0 ? "The amount must be above zero." : null;
  const dateError = !validDate ? (date > today ? "Pick today or an earlier day." : "Pick a date.") : null;
  const rateError =
    !isUsd && !usingReference && (enteredRate === null || enteredRate <= 0) ? "Enter a rate above zero, or leave it blank." : null;
  const referenceError =
    usingReference && validDate && !reference.isLoading && !reference.fix
      ? `Couldn't get a reference rate for ${currency} on that day. Enter the rate you got instead.`
      : null;
  const rateWarning =
    !isUsd && !usingReference && enteredRate && reference.fix && Math.abs(enteredRate / reference.fix.rate - 1) > RATE_WARN_GAP
      ? `That's far from the reference rate (1 USD = ${formatRate(reference.fix.rate)} ${currency}). Check it's ${currency} for one US dollar.`
      : null;

  const usd = amount !== null && amount > 0 && rate !== null && rate > 0 ? depositUsd({ amount, rate }) : null;
  const waitingForRate = usingReference && validDate && reference.isLoading;
  const canSave = !amountError && !dateError && !rateError && !referenceError && usd !== null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!canSave || amount === null || rate === null) return;
    addCashDeposit({
      id: newDepositId(),
      date: parseDateInputAsLocal(date).toISOString(),
      currency,
      amount,
      rate,
      rateSource: isUsd ? null : usingReference ? "reference" : "entered",
      rateDate: usingReference && reference.fix ? reference.fix.date : null,
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    router.push("/");
  }

  const show = (error: string | null) => (submitted ? error : null);

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Add cash</CardTitle>
            <CardSubtitle>Money you put into this portfolio. It counts as capital, not as a gain.</CardSubtitle>
          </div>
        </CardHeader>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <FormField label="Amount">
            <input
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value.replace(/[^0-9.,]/g, ""))}
              placeholder={isUsd ? "1,000" : "10,000"}
              aria-invalid={Boolean(show(amountError))}
              className={inputClass}
              autoFocus
            />
            {show(amountError) && <FieldError>{amountError}</FieldError>}
          </FormField>
          <label className="block">
            <span className="oc-field-label">Currency</span>
            <CurrencySelect label="Currency" value={currency} onChange={setCurrency} />
          </label>
          <FormField label="Date added">
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={Boolean(show(dateError))}
              className={inputClass}
            />
            {show(dateError) && <FieldError>{dateError}</FieldError>}
          </FormField>
        </div>

        {!isUsd && (
          <div className="mt-4">
            <div className="oc-field-label flex items-center gap-1.5">
              <label htmlFor="cash-rate">Conversion rate (optional)</label>
              <InfoTip label="About the conversion rate">
                Leave this blank and we&apos;ll use a common conversion rate: the daily reference rate for USD/
                {currency} on the date you added the cash (or the last one published before it, for weekends and
                holidays). Enter your own rate to match what your bank or broker actually gave you.
              </InfoTip>
            </div>
            <div
              className={cn(
                fieldClass,
                "flex h-11 items-center focus-within:border-ns-primary focus-within:ring-3 focus-within:ring-ns-primary-soft sm:max-w-sm",
                show(rateError) && "border-ns-danger"
              )}
            >
              <span className="ns-label shrink-0 pl-3.5 font-normal text-ns-ink-subtle">1 USD =</span>
              <input
                id="cash-rate"
                inputMode="decimal"
                value={rateText}
                onChange={(e) => setRateText(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder={reference.fix ? formatRate(reference.fix.rate) : "Reference rate"}
                aria-invalid={Boolean(show(rateError))}
                aria-describedby="cash-rate-hint"
                className="h-full min-w-0 flex-1 bg-transparent px-2 tabular-nums text-ns-ink placeholder:text-ns-ink-subtle focus:outline-none"
              />
              <span className="ns-label shrink-0 pr-3.5 font-normal text-ns-ink-subtle">{currency}</span>
            </div>
            <p id="cash-rate-hint" className="ns-caption mt-1.5 font-normal text-ns-ink-subtle">
              {usingReference
                ? !validDate
                  ? "Pick a date to look up its reference rate."
                  : reference.isLoading
                    ? "Looking up the reference rate for that day…"
                    : reference.fix
                      ? `Blank uses the reference rate: 1 USD = ${formatRate(reference.fix.rate)} ${currency}, fixed ${formatRateDate(reference.fix.date)}.`
                      : "No reference rate for that day. Enter the rate you got."
                : "Your rate is saved with the deposit."}
            </p>
            {show(rateError) && <FieldError>{rateError}</FieldError>}
            {rateWarning && (
              <p role="status" className="ns-caption mt-1.5 font-normal text-ns-warning">
                {rateWarning}
              </p>
            )}
          </div>
        )}

        <div className="mt-4">
          <FormField label="Note (optional)">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Monthly top-up, bonus, transfer from savings…"
              className={textareaClass}
            />
          </FormField>
        </div>

        <div className="mt-5 rounded-ns-md bg-ns-sunken px-4 py-3" aria-live="polite">
          <p className="ns-label text-ns-ink-muted">Adds to cash</p>
          <p className="ns-amount-md oc-num mt-0.5 text-ns-ink">
            {usd !== null ? formatCurrency(usd) : waitingForRate && amount ? "…" : "—"}
          </p>
          <p className="ns-caption mt-1 font-normal text-ns-ink-muted">
            {usd !== null && amount !== null && !isUsd && rate !== null
              ? `${formatMoney(amount, currency)} at ${formatRate(rate)} ${currency} per US dollar${
                  usingReference && reference.fix ? ` · reference rate, ${formatRateDate(reference.fix.date)}` : " · your rate"
                }`
              : validDate
                ? `Logged on ${format(parseDateInputAsLocal(date), "MMM d, yyyy")}`
                : " "}
          </p>
        </div>

        {show(referenceError) && <FieldError className="mt-3">{referenceError}</FieldError>}
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={waitingForRate}>
          {waitingForRate ? "Getting the rate…" : "Add cash"}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span role="alert" className={cn("ns-caption mt-1.5 block font-normal text-ns-danger", className)}>
      {children}
    </span>
  );
}
