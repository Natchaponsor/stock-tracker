"use client";

import Link from "next/link";
import { usePositionStore } from "@/store/usePositionStore";
import { formatRate, formatRateDate, pairSlug } from "@/lib/fx";
import { cn } from "@/lib/cn";

const ROW = "flex items-baseline justify-between gap-4 border-t border-ns-line py-3";

/**
 * The one fuchsia call-out on an FX page: a rate alert that fired and hasn't
 * been dismissed. Shows the latest and names the rest.
 */
export function FxAlertCallout({ className, pair }: { className?: string; pair?: string }) {
  const fxAlerts = usePositionStore((s) => s.fxAlerts);
  const dismissFxAlert = usePositionStore((s) => s.dismissFxAlert);

  const fired = fxAlerts
    .filter((a) => a.state === "fired" && !a.seen)
    .sort((a, b) => Number(b.pair === pair) - Number(a.pair === pair) || (b.firedAt ?? "").localeCompare(a.firedAt ?? ""));
  if (fired.length === 0) return null;
  const [alert, ...rest] = fired;
  const { kind, level } = alert.condition;

  return (
    <section aria-labelledby="fx-alert-heading" className={cn("oc-card oc-card-web oc-callout min-w-0", className)}>
      <div className="oc-card-head">
        <span className="oc-badge oc-badge-accent">
          <span className="oc-dot" aria-hidden="true" />
          Rate alert
        </span>
        {alert.firedAt && <span className="oc-sub oc-num">Fix of {formatRateDate(alert.firedAt)}</span>}
      </div>

      <h2 id="fx-alert-heading" className="text-[18px] leading-6 font-semibold text-ns-ink">
        {alert.pair} {kind === "above" ? "rose above" : "fell below"} {formatRate(level)}
      </h2>

      <dl className="ns-body oc-num mt-2 text-[14px]!">
        <div className={ROW}>
          <dt className="text-ns-ink-muted">Rate when it fired</dt>
          <dd className="font-semibold text-ns-ink">{alert.firedRate !== null ? formatRate(alert.firedRate) : "—"}</dd>
        </div>
        {alert.note && (
          <div className={ROW}>
            <dt className="shrink-0 text-ns-ink-muted">Your note</dt>
            <dd className="min-w-0 text-right font-semibold text-ns-ink">
              <span className="line-clamp-2">{alert.note}</span>
            </dd>
          </div>
        )}
      </dl>

      {alert.pair !== pair && (
        <Link href={`/fx/${pairSlug(alert.pair)}`} className="oc-btn oc-btn-accent oc-btn-block mt-3.5 no-underline">
          View {alert.pair}
        </Link>
      )}
      <button
        type="button"
        onClick={() => dismissFxAlert(alert.id)}
        className={cn("oc-btn oc-btn-secondary oc-btn-block py-[11px]!", alert.pair !== pair ? "mt-2.5" : "mt-3.5")}
      >
        Dismiss
      </button>

      {rest.length > 0 && (
        <p className="oc-sub mt-3 text-center">Also fired: {rest.map((a) => `${a.pair} ${a.condition.kind} ${formatRate(a.condition.level)}`).join(", ")}</p>
      )}
    </section>
  );
}
