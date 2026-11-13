"use client";

import { useMemo, useState } from "react";
import { Bell, Pencil, Plus, Trash2 } from "lucide-react";
import { NsCard, NsEmpty, NsSkeleton } from "@/components/navy/primitives";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { FxChange, InlineSkeleton } from "@/components/fx/FxBits";
import { FxChartLegend, FxRateChart } from "@/components/fx/FxRateChart";
import { FxAlertDialog } from "@/components/fx/FxAlertDialog";
import { FxConverter } from "@/components/fx/FxConverter";
import { useFxHistory, useFxNews } from "@/hooks/useFx";
import { useNow } from "@/components/log/clock";
import { usePositionStore } from "@/store/usePositionStore";
import {
  changeOver,
  directionLabel,
  formatRate,
  formatRateDate,
  FX_RANGES,
  isBetter,
  ratePercentile,
  splitPair,
  yearRange,
  type FxRange,
} from "@/lib/fx";
import { daysUntil, nextDecisions } from "@/lib/fxCalendar";
import { formatAgo } from "@/lib/priceTime";
import type { FxAlert, FxDirection, FxPair } from "@/lib/types";

const TEN_YEARS = 3660;

/**
 * Everything about one pair: rate, chart, where today sits in the past year,
 * alerts, upcoming central-bank decisions, headlines and a converter.
 */
export function FxPairDetail({ pair }: { pair: FxPair }) {
  const [base, quote] = splitPair(pair);
  const item = usePositionStore((s) => s.fxWatchlist.find((w) => w.pair === pair));
  const addFxPair = usePositionStore((s) => s.addFxPair);
  const setFxDirection = usePositionStore((s) => s.setFxDirection);
  const [localDirection, setLocalDirection] = useState<FxDirection>("base-to-quote");
  const direction = item?.direction ?? localDirection;

  const [range, setRange] = useState<FxRange>("1Y");
  const { bars, latest, isLoading, hasError } = useFxHistory(pair, TEN_YEARS);
  const thbPair = base === "THB" || quote === "THB";
  const bot = useFxHistory(thbPair ? pair : null, 14, "BOT");

  const week = changeOver(bars, 7);
  const band = yearRange(bars);
  const percentile = ratePercentile(bars, direction);

  const allAlerts = usePositionStore((s) => s.fxAlerts);
  const alerts = useMemo(() => allAlerts.filter((a) => a.pair === pair), [allAlerts, pair]);
  const alertLevels = useMemo(
    () => alerts.filter((a) => a.state !== "paused").map((a) => a.condition.level),
    [alerts]
  );

  const directions: Record<string, FxDirection> = {
    [directionLabel(pair, "base-to-quote")]: "base-to-quote",
    [directionLabel(pair, "quote-to-base")]: "quote-to-base",
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="ns-title text-ns-ink">{pair}</h1>
          <p className="ns-caption mt-0.5 text-ns-ink-muted">How many {quote} one {base} buys</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="ns-amount-xl oc-num text-ns-ink">
              {latest ? formatRate(latest.rate) : isLoading ? <InlineSkeleton className="h-9 w-32" /> : "—"}
            </span>
            <FxChange value={week} suffix="this week" className="ns-body" />
          </div>
          <p className="ns-caption mt-1 text-ns-ink-muted">
            {latest && `Blended central-bank reference rate · ${formatRateDate(latest.date)}`}
            {bot.latest && (
              <>
                <br />
                Thai banks (Bank of Thailand): <span className="oc-num">{formatRate(bot.latest.rate)}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <span className="ns-caption text-ns-ink-muted">I usually convert</span>
          <Segmented
            size="sm"
            options={Object.keys(directions)}
            value={directionLabel(pair, direction)}
            onChange={(label) => (item ? setFxDirection(pair, directions[label]) : setLocalDirection(directions[label]))}
          />
          {!item && (
            <Button size="sm" variant="primary" onClick={() => addFxPair(pair, direction)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add to your pairs
            </Button>
          )}
        </div>
      </header>

      {hasError && bars.length === 0 ? (
        <NsEmpty title="Rates are unavailable" description="The rate source didn't answer. Try again in a few minutes." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            <NsCard
              title="Rate history"
              meta="Daily reference rates"
              action={<Segmented size="sm" options={FX_RANGES} value={range} onChange={setRange} />}
            >
              {isLoading ? (
                <NsSkeleton className="h-64 w-full md:h-80" />
              ) : (
                <>
                  <FxRateChart bars={bars} range={range} alertLevels={alertLevels} />
                  <div className="mt-3">
                    <FxChartLegend showMas={range !== "1M"} />
                  </div>
                </>
              )}
            </NsCard>

            <PercentileCard pair={pair} direction={direction} percentile={percentile} band={band} rate={latest?.rate ?? null} />

            <AlertsCard pair={pair} alerts={alerts} rate={latest?.rate ?? null} band={band} />
          </div>

          <div className="min-w-0 space-y-5">
            <DecisionsCard currencies={[base, quote]} />
            <NewsCard currencies={[base, quote]} />
            <FxConverter
              defaultFrom={direction === "base-to-quote" ? base : quote}
              defaultTo={direction === "base-to-quote" ? quote : base}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PercentileCard({
  pair,
  direction,
  percentile,
  band,
  rate,
}: {
  pair: FxPair;
  direction: FxDirection;
  percentile: number | null;
  band: ReturnType<typeof yearRange>;
  rate: number | null;
}) {
  // The better end of the range, for this direction, is drawn on the right.
  const betterHigh = isBetter(2, 1, direction);
  const marker = band ? (betterHigh ? band.position : 1 - band.position) : null;

  return (
    <NsCard title={`For ${directionLabel(pair, direction)}`} meta="Where today's rate sits in the past year">
      {percentile === null || rate === null || !band ? (
        <NsEmpty title="Not enough history yet" />
      ) : (
        <div className="space-y-4">
          <p className="ns-body text-ns-ink">
            Today&apos;s <span className="oc-num font-semibold">{formatRate(rate)}</span> is better than{" "}
            <span className="oc-num font-semibold">{Math.round(percentile * 100)}%</span> of days in the past year.
          </p>
          <div>
            <div className="relative">
              <div className="oc-track" />
              <span
                aria-hidden="true"
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ns-card bg-ns-primary shadow-ns-card"
                style={{ left: `${(marker ?? 0.5) * 100}%` }}
              />
            </div>
            <div className="ns-caption oc-num mt-2 flex justify-between text-ns-ink-muted">
              <span>Worse · {formatRate(betterHigh ? band.low : band.high)}</span>
              <span>{formatRate(betterHigh ? band.high : band.low)} · Better</span>
            </div>
          </div>
          <p className="ns-caption text-ns-ink-subtle">Context from past rates, not a forecast.</p>
        </div>
      )}
    </NsCard>
  );
}

function AlertsCard({
  pair,
  alerts,
  rate,
  band,
}: {
  pair: FxPair;
  alerts: FxAlert[];
  rate: number | null;
  band: ReturnType<typeof yearRange>;
}) {
  const [editing, setEditing] = useState<FxAlert | null>(null);
  const [creating, setCreating] = useState(false);
  const updateFxAlert = usePositionStore((s) => s.updateFxAlert);
  const removeFxAlert = usePositionStore((s) => s.removeFxAlert);

  const status = (a: FxAlert) =>
    a.state === "paused"
      ? "Paused"
      : a.state === "fired"
        ? `Fired ${a.firedAt ? formatRateDate(a.firedAt) : ""}${a.firedRate !== null ? ` at ${formatRate(a.firedRate)}` : ""}${a.repeat === "rearm" ? " · re-arms after a 0.5% move back" : ""}`
        : "Armed";

  return (
    <NsCard
      title="Alerts"
      meta="Checked on open, and daily with push on"
      action={
        <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
          <Bell className="h-4 w-4" aria-hidden="true" />
          New alert
        </Button>
      }
    >
      {alerts.length === 0 ? (
        <NsEmpty title="No alerts on this pair" description="Set a level and hear about it when the rate gets there." />
      ) : (
        <ul>
          {alerts.map((a) => (
            <li key={a.id} className="flex items-start gap-3 border-t border-ns-line py-3 first:border-t-0">
              <span
                aria-hidden="true"
                className={
                  a.state === "armed"
                    ? "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-ns-primary"
                    : "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-ns-ink-subtle"
                }
              />
              <div className="min-w-0 flex-1">
                <p className="ns-body text-ns-ink">
                  <span className="font-semibold capitalize">{a.condition.kind}</span>{" "}
                  <span className="oc-num font-semibold">{formatRate(a.condition.level)}</span>
                  <span className="text-ns-ink-muted"> · {a.repeat === "once" ? "once" : "every time"}</span>
                </p>
                <p className="ns-caption text-ns-ink-muted">{status(a)}</p>
                {a.note && <p className="ns-caption mt-0.5 text-ns-ink-subtle">“{a.note}”</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {a.state === "armed" ? (
                  <Button size="sm" variant="ghost" onClick={() => updateFxAlert(a.id, { state: "paused" })}>
                    Pause
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => updateFxAlert(a.id, { state: "armed" })}>
                    {a.state === "paused" ? "Resume" : "Re-arm"}
                  </Button>
                )}
                <button
                  type="button"
                  aria-label="Edit alert"
                  onClick={() => setEditing(a)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ns-ink-muted hover:bg-ns-sunken hover:text-ns-ink"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Delete alert"
                  onClick={() => removeFxAlert(a.id)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ns-ink-muted hover:bg-ns-sunken hover:text-ns-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <FxAlertDialog
        open={creating || editing !== null}
        pair={pair}
        currentRate={rate}
        yearLow={band?.low ?? null}
        yearHigh={band?.high ?? null}
        alert={editing ?? undefined}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </NsCard>
  );
}

function DecisionsCard({ currencies }: { currencies: string[] }) {
  const now = useNow();
  if (now === null) return null;
  const today = new Date(now).toISOString().slice(0, 10);
  const decisions = nextDecisions(currencies, today);
  return (
    <NsCard title="Next policy decisions" meta="Central-bank rate decisions often move currencies">
      {decisions.length === 0 ? (
        <NsEmpty title="No calendar for these currencies yet" description="The calendar covers the Fed and the Bank of Thailand." />
      ) : (
        <ul>
          {decisions.map((d) => {
            const days = daysUntil(d.date, today);
            return (
              <li key={d.bank} className="flex items-baseline justify-between gap-3 border-t border-ns-line py-2.5 first:border-t-0">
                <a href={d.source} target="_blank" rel="noreferrer" className="ns-body font-semibold text-ns-ink no-underline hover:text-ns-primary-text">
                  {d.bank}
                </a>
                <span className="ns-body oc-num text-ns-ink-muted">
                  {formatRateDate(d.date)} · {days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </NsCard>
  );
}

function NewsCard({ currencies }: { currencies: string[] }) {
  const { items, isLoading, hasError } = useFxNews(currencies);
  const now = useNow();
  return (
    <NsCard title="Headlines" meta="Forex news matched by currency name">
      {isLoading ? (
        <div className="space-y-3">
          <NsSkeleton className="h-4 w-full" />
          <NsSkeleton className="h-4 w-4/5" />
          <NsSkeleton className="h-4 w-3/5" />
        </div>
      ) : items.length === 0 ? (
        <NsEmpty
          title={hasError ? "News is unavailable right now" : "No recent headlines"}
          description={hasError ? undefined : `Nothing in the latest forex news mentions ${currencies.join(" or ")}.`}
        />
      ) : (
        <ul>
          {items.map((n) => (
            <li key={n.url} className="border-t border-ns-line py-2.5 first:border-t-0">
              <a href={n.url} target="_blank" rel="noreferrer" className="ns-body line-clamp-2 text-ns-ink no-underline hover:text-ns-primary-text">
                {n.headline}
              </a>
              <p className="ns-caption mt-0.5 text-ns-ink-subtle">
                {n.source}
                {now !== null && ` · ${formatAgo(now - Date.parse(n.datetime))}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </NsCard>
  );
}
