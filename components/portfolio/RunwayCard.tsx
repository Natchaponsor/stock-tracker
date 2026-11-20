"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { format } from "date-fns";
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import { NsCard, NsEmpty, NsPnl, NsSkeleton } from "@/components/navy/primitives";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { usePositionStore } from "@/store/usePositionStore";
import { useQuotes } from "@/hooks/useQuotes";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { formatCurrency } from "@/lib/format";
import {
  buildValueSeries,
  capitalAt,
  capitalSteps,
  bookStart,
  dayKey,
  dayMovesFromQuotes,
  dayTime,
  rangeStart,
  sectorMoves,
  type RunwayRange,
  type SectorMoves,
} from "@/lib/runway";

const VIEWS = ["Capital", "Value", "Sectors"] as const;
type View = (typeof VIEWS)[number];

const LINE_RANGES = ["1M", "3M", "YTD", "All"] as const satisfies readonly RunwayRange[];
const SECTOR_RANGES = ["1D", "1M", "3M", "YTD", "All"] as const satisfies readonly RunwayRange[];

const META: Record<View, string> = {
  Capital: "Cash you've put in",
  Value: "Portfolio value vs. capital",
  Sectors: "Gain or loss by sector",
};

/** This device's last view and range, so the card opens where it was left. Never synced. */
const PREFS_KEY = "stock-tracker-runway";

function readPrefs(): { view: View; range: RunwayRange } {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as { view?: View; range?: RunwayRange };
    return {
      view: VIEWS.includes(raw.view as View) ? (raw.view as View) : "Capital",
      range: (SECTOR_RANGES as readonly string[]).includes(raw.range ?? "") ? raw.range! : "All",
    };
  } catch {
    return { view: "Capital", range: "All" };
  }
}

function savePrefs(prefs: { view: View; range: RunwayRange }) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Not saved: the card still works for this visit.
  }
}

interface ChartPoint {
  t: number;
  date: string;
  capital: number;
  value?: number;
}

const longDate = (day: string) => format(dayTime(day), "d MMM yyyy");

/** Axis money: always short ($9.9K, $12K), so ticks line up. */
const axisMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});
/** Spans shorter than this label days (18 Nov); longer ones label months (Nov 26). */
const DAY_TICKS_MAX_MS = 1000 * 60 * 60 * 24 * 120;

type Prefs = { view: View; range: RunwayRange };

/** The ranges a view offers, and the range it shows (a range it lacks falls back to 1M). */
function rangesFor(prefs: Prefs): { ranges: readonly RunwayRange[]; range: RunwayRange } {
  const ranges: readonly RunwayRange[] = prefs.view === "Sectors" ? SECTOR_RANGES : LINE_RANGES;
  return { ranges, range: ranges.includes(prefs.range) ? prefs.range : "1M" };
}

/**
 * Runway: one small chart with three views under Allocation by sector.
 * Capital is the money put in over time (starting cash, then each deposit).
 * Value is the book's worth at each close, rebuilt from dated fills and daily
 * prices, drawn over the capital line so the gap between them is the real gain.
 * Sectors is how much each sector made or lost over the range, trades taken out.
 *
 * The title (or a double-click anywhere on the card but its controls) opens the
 * same views large. Card and large view share one view and range.
 */
export function RunwayCard() {
  const [prefs, setPrefs] = useState<Prefs>(readPrefs);
  const [expanded, setExpanded] = useState(false);
  const { view } = prefs;
  const { range } = rangesFor(prefs);
  const update = (next: Partial<Prefs>) => {
    const merged = { view, range, ...next };
    setPrefs(merged);
    savePrefs(merged);
  };

  return (
    <>
      <NsCard
        title="Runway"
        meta={META[view]}
        // From 1024px the card fills what Allocation leaves of the row, and the chart takes the slack.
        className="lg:flex lg:flex-1 lg:flex-col"
        bodyClassName="lg:flex lg:flex-1 lg:flex-col"
        onTitleClick={() => setExpanded(true)}
        titleHint="Open a larger view"
        onDoubleClick={(e) => {
          // Quick clicks on the view and range switches aren't a request to expand.
          if ((e.target as HTMLElement).closest("button, a, input")) return;
          setExpanded(true);
        }}
        action={<Segmented size="sm" options={VIEWS} value={view} onChange={(v) => update({ view: v })} />}
      >
        <RunwayBody prefs={prefs} update={update} large={false} />
      </NsCard>
      <RunwayDialog open={expanded} onClose={() => setExpanded(false)} prefs={prefs} update={update} />
    </>
  );
}

/** The large Runway: the same views and range as the card, with a tall chart. */
function RunwayDialog({
  open,
  onClose,
  prefs,
  update,
}: {
  open: boolean;
  onClose: () => void;
  prefs: Prefs;
  update: (next: Partial<Prefs>) => void;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
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
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="fixed inset-x-3 top-[max(1rem,6vh)] bottom-4 z-50 mx-auto flex max-w-5xl flex-col overflow-hidden rounded-ns-lg bg-ns-card shadow-ns-card sm:bottom-auto sm:max-h-[88vh]"
          >
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-ns-line px-5 py-4 md:px-6">
              <div className="min-w-0 flex-1 basis-48">
                <h2 id={titleId} className="ns-heading text-ns-ink">
                  Runway
                </h2>
                <p className="ns-label mt-0.5 font-normal text-ns-ink-muted">{META[prefs.view]}</p>
              </div>
              <div className="flex items-center gap-2">
                <Segmented size="sm" options={VIEWS} value={prefs.view} onChange={(v) => update({ view: v })} />
                <button
                  type="button"
                  onClick={onClose}
                  autoFocus
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ns-ink-muted hover:bg-ns-sunken hover:text-ns-ink"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">
              <RunwayBody prefs={prefs} update={update} large />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Headline, range switch and the chart or sector bars for the current view. */
function RunwayBody({ prefs, update, large }: { prefs: Prefs; update: (next: Partial<Prefs>) => void; large: boolean }) {
  const { view } = prefs;
  const { ranges, range } = rangesFor(prefs);
  // In the card the chart is 160px, and from 1024px it grows to fill the row's spare height.
  const chartHeight = large ? "h-[min(56vh,460px)]" : "h-40 lg:h-auto lg:min-h-40 lg:flex-1";

  const positions = usePositionStore((s) => s.positions);
  const startingCash = usePositionStore((s) => s.startingCash);
  const deposits = usePositionStore((s) => s.cashDeposits);
  const customSectors = usePositionStore((s) => s.customSectors);
  const hidePnl = usePositionStore((s) => s.hidePnl);

  const today = format(new Date(), "yyyy-MM-dd");
  const start = useMemo(() => bookStart(positions, deposits), [positions, deposits]);

  const openSymbols = useMemo(
    () => Array.from(new Set(positions.filter((p) => p.status === "open").map((p) => p.symbol))),
    [positions]
  );
  const { quotes } = useQuotes(openSymbols);

  // Daily prices are only needed past the Capital view and today's sector move,
  // and only from the day each symbol was first traded.
  const needsHistory = view === "Value" || (view === "Sectors" && range !== "1D");
  const need = useMemo(() => {
    const out: Record<string, string> = {};
    if (!needsHistory) return out;
    for (const p of positions) {
      for (const f of [...p.entries, ...p.exits]) {
        const day = dayKey(f.date);
        if (!out[p.symbol] || day < out[p.symbol]) out[p.symbol] = day;
      }
    }
    return out;
  }, [positions, needsHistory]);
  const history = usePriceHistory(need);

  const steps = useMemo(
    () => (start ? capitalSteps(startingCash, deposits, start) : []),
    [startingCash, deposits, start]
  );

  const series = useMemo(
    () =>
      needsHistory
        ? buildValueSeries({ positions, startingCash, deposits, bars: history.bars, quotes, customSectors, today })
        : null,
    [needsHistory, positions, startingCash, deposits, history.bars, quotes, customSectors, today]
  );

  const from = rangeStart(range, today);
  const capitalNow = start ? capitalAt(steps, today) : startingCash;

  const capitalPoints = useMemo<ChartPoint[]>(() => {
    if (!start) return [];
    const first = from > start ? from : start;
    const points: ChartPoint[] = [{ t: dayTime(first), date: first, capital: capitalAt(steps, first) }];
    for (const s of steps) if (s.date > first) points.push({ t: dayTime(s.date), date: s.date, capital: s.capital });
    if (today > points[points.length - 1].date) points.push({ t: dayTime(today), date: today, capital: capitalNow });
    return points;
  }, [start, from, steps, today, capitalNow]);

  const valuePoints = useMemo<ChartPoint[]>(
    () =>
      (series?.points ?? [])
        .filter((p) => p.date >= from)
        .map((p) => ({ t: dayTime(p.date), date: p.date, capital: p.capital, value: p.value })),
    [series, from]
  );

  const moves = useMemo<SectorMoves | null>(() => {
    if (view !== "Sectors") return null;
    if (range === "1D") return dayMovesFromQuotes(positions, quotes, customSectors, today);
    return series ? sectorMoves(series, range, today, positions, customSectors) : null;
  }, [view, range, positions, quotes, customSectors, today, series]);

  const money = (v: number) => (hidePnl ? "••••" : formatCurrency(v));
  const addedInRange = capitalNow - (from && start && from > start ? capitalAt(steps, from) : 0);
  const lastValue = valuePoints[valuePoints.length - 1];
  const waitingForPrices = history.loading && history.bars.size === 0;
  const pricesFailed = !history.loading && history.bars.size === 0 && Object.keys(history.errors).length > 0;

  let headline: React.ReactNode = null;
  if (start) {
    if (view === "Capital") {
      headline = (
        <Headline amount={money(capitalNow)}>
          {range === "All" ? `${deposits.length} deposit${deposits.length === 1 ? "" : "s"} plus starting cash` : `${money(addedInRange)} added in ${range}`}
        </Headline>
      );
    } else if (view === "Value" && lastValue?.value !== undefined) {
      headline = (
        <Headline amount={money(lastValue.value)}>
          <NsPnl value={lastValue.value - lastValue.capital} formatted={formatCurrency(lastValue.value - lastValue.capital, { signed: true })} /> vs. capital
        </Headline>
      );
    } else if (view === "Sectors" && moves) {
      headline = (
        <Headline amount={<NsPnl value={moves.total} formatted={formatCurrency(moves.total, { signed: true })} showGlyph={false} />}>
          {range === "1D" ? "Last session" : moves.from ? `Since ${longDate(moves.from)}` : "Since your first trade"}
        </Headline>
      );
    }
  }

  let body: React.ReactNode;
  if (!start) {
    body = <NsEmpty title="Nothing on the runway yet" description="Log a deposit or a trade and the chart starts from that day." />;
  } else if (view !== "Capital" && needsHistory && history.needsKey) {
    body = (
      <NsEmpty
        title="Daily prices aren't set up"
        description="Add a free Tiingo key as TIINGO_API_KEY in the server settings to rebuild your daily value."
      />
    );
  } else if (view === "Capital") {
    body = <RunwayChart points={capitalPoints} range={range} hidden={hidePnl} heightClass={chartHeight} capitalOnly />;
  } else if (pricesFailed && view === "Value") {
    body = (
      <NsEmpty
        title="Couldn't load daily prices"
        description={`The price service didn't answer (${Object.values(history.errors)[0]}). It tries again next time you open this view.`}
      />
    );
  } else if (waitingForPrices) {
    body = <NsSkeleton className={cn(chartHeight, "w-full")} />;
  } else if (view === "Value") {
    body = <RunwayChart points={valuePoints} range={range} hidden={hidePnl} heightClass={chartHeight} />;
  } else {
    body = moves && moves.moves.length > 0 ? <SectorBars moves={moves} hidden={hidePnl} large={large} /> : (
      <NsEmpty title="No movement in this range" description="Sectors show here once a held stock moves." />
    );
  }

  // Only worth saying when prices work for some stocks and not others.
  const unpriced = view !== "Capital" && range !== "1D" && history.bars.size > 0 ? series?.unpriced ?? [] : [];

  return (
    <div className={cn(!large && "lg:flex lg:flex-1 lg:flex-col")}>
      {start && (
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">{headline}</div>
          <Segmented size="sm" options={ranges} value={range} onChange={(r) => update({ range: r })} />
        </div>
      )}
      {body}
      {unpriced.length > 0 && !history.loading && (
        <p className="ns-caption mt-2 text-ns-ink-subtle">
          No price history for {unpriced.join(", ")}, so {unpriced.length === 1 ? "it's" : "they're"} valued at the last fill price.
        </p>
      )}
    </div>
  );
}

function Headline({ amount, children }: { amount: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <p className="ns-amount-md oc-num text-ns-ink">{amount}</p>
      <p className="ns-caption mt-0.5 text-ns-ink-muted">{children}</p>
    </>
  );
}

function ChartTooltip({ active, payload, hidden }: Partial<TooltipContentProps<number, string>> & { hidden: boolean }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as ChartPoint;
  const money = (v: number) => (hidden ? "••••" : formatCurrency(v));
  return (
    <div className="rounded-ns-sm border border-ns-line bg-ns-card px-3 py-2 shadow-ns-card">
      <p className="ns-caption text-ns-ink-muted">{longDate(p.date)}</p>
      {p.value !== undefined && <p className="ns-label oc-num mt-0.5 text-ns-ink">Value {money(p.value)}</p>}
      <p className="ns-label oc-num mt-0.5 text-ns-ink-muted">Capital {money(p.capital)}</p>
      {p.value !== undefined && (
        <p className="ns-caption mt-0.5">
          <NsPnl value={p.value - p.capital} formatted={formatCurrency(p.value - p.capital, { signed: true })} />
        </p>
      )}
    </div>
  );
}

/** Value as an area with capital as a dashed step line behind it, or capital alone as a stepped area. */
function RunwayChart({
  points,
  range,
  hidden,
  heightClass,
  capitalOnly = false,
}: {
  points: ChartPoint[];
  range: RunwayRange;
  hidden: boolean;
  heightClass: string;
  capitalOnly?: boolean;
}) {
  // The card and the large view can both be on screen, so each needs its own gradient.
  const fillId = `runway-fill-${useId().replace(/:/g, "")}`;
  if (points.length < 2) {
    return <NsEmpty title="Not enough days to draw yet" description="The line starts once there's more than one day in this range." />;
  }
  const shortSpan = points[points.length - 1].t - points[0].t < DAY_TICKS_MAX_MS;
  return (
    <>
    <div className={heightClass} role="img" aria-label={capitalOnly ? `Capital over time, ${range}` : `Portfolio value and capital, ${range}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t: number) => format(t, shortSpan ? "d MMM" : "MMM yy")}
            minTickGap={28}
            stroke="var(--ink-subtle)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
            fontFamily="var(--font-sans)"
          />
          <YAxis
            domain={capitalOnly ? [0, "auto"] : ["auto", "auto"]}
            tickFormatter={(v: number) => (hidden ? "" : axisMoney.format(v))}
            width={hidden ? 4 : 52}
            stroke="var(--ink-subtle)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            fontFamily="var(--font-sans)"
          />
          <Tooltip content={<ChartTooltip hidden={hidden} />} cursor={{ stroke: "var(--line)" }} />
          {capitalOnly ? (
            <Area
              dataKey="capital"
              type="stepAfter"
              stroke="var(--primary)"
              strokeWidth={2}
              fill={`url(#${fillId})`}
              isAnimationActive={false}
            />
          ) : (
            <>
              <Line
                dataKey="capital"
                type="stepAfter"
                stroke="var(--ink-subtle)"
                strokeWidth={1.25}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
              />
              <Area
                dataKey="value"
                type="monotone"
                stroke="var(--primary)"
                strokeWidth={2}
                fill={`url(#${fillId})`}
                dot={false}
                isAnimationActive={false}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
      {!capitalOnly && (
        <div className="ns-caption mt-1 flex gap-4 text-ns-ink-muted" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-ns-primary" />
            Value
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-4 border-t border-dashed border-ns-ink-subtle" />
            Capital
          </span>
        </div>
      )}
    </>
  );
}

/** One row per sector: its colour dot and name, a bar out from the centre line (right gain, left loss), the amount. */
function SectorBars({ moves, hidden, large }: { moves: SectorMoves; hidden: boolean; large: boolean }) {
  const largest = Math.max(...moves.moves.map((m) => Math.abs(m.change)), 1);
  return (
    <ul className={cn("flex flex-col", large ? "gap-4" : "gap-2.5")}>
      {moves.moves.map((m) => {
        const width = `${Math.max(2, (Math.abs(m.change) / largest) * 50)}%`;
        const gain = m.change >= 0;
        return (
          <li
            key={m.key}
            className={cn(
              "grid items-center gap-x-3",
              "grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto]",
              large && "md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]"
            )}
          >
            <span className="ns-label flex min-w-0 items-center gap-2 text-ns-ink">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: m.color }} />
              <span className="truncate">{m.name}</span>
            </span>
            <span className={cn("relative rounded-full bg-ns-sunken", large ? "h-3" : "h-2")} aria-hidden="true">
              <span className="absolute inset-y-0 left-1/2 w-px bg-ns-line" />
              <span
                className={gain ? "absolute inset-y-0 left-1/2 rounded-r-full bg-ns-success" : "absolute inset-y-0 right-1/2 rounded-l-full bg-ns-danger"}
                style={{ width }}
              />
            </span>
            <span className="ns-label w-[5.5rem] text-right">
              <NsPnl value={m.change} formatted={hidden ? "••••" : formatCurrency(m.change, { signed: true })} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
