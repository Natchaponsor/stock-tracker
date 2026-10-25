"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Band, BandRaw, EmptyEntry, LogRow } from "@/components/log/Band";
import { usePositionStore } from "@/store/usePositionStore";
import { cn } from "@/lib/cn";
import {
  ASSET_CLASS_LABELS,
  filterTransactions,
  findBookOverlap,
  formatAmountRange,
  formatCompactUsd,
  formatDisclosureDate,
  normalizeSymbol,
  sumRanges,
  type AssetClass,
  type DisclosureSource,
  type DisclosureTransaction,
  type Filer,
  type TransactionType,
} from "@/lib/disclosures";
import { disclosureDataset } from "@/lib/disclosureData";

const { filers, filings, transactions, holdings, updatedAt, coverageNote } = disclosureDataset;
const filerById = new Map<string, Filer>(filers.map((f) => [f.id, f]));

/** Only filers with dated trades get a filter tab; the rest live under Holdings. */
const tradingFilers = filers.filter((f) => transactions.some((t) => t.filerId === f.id));
const tradedClasses = (Object.keys(ASSET_CLASS_LABELS) as AssetClass[]).filter((c) =>
  transactions.some((t) => t.assetClass === c)
);

function filerName(id: string): string {
  return filerById.get(id)?.name ?? id;
}

function SourceLink({ source }: { source: DisclosureSource }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="stamp inline-flex items-center gap-0.5 text-fg-subtle transition-colors hover:text-fg"
    >
      {source.label}
      <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/** Buy/sell carries a glyph and a word as well as its colour (Two Cues Rule). */
function SideMark({ type }: { type: TransactionType }) {
  return (
    <span className={cn("stamp", type === "buy" ? "text-gain" : "text-loss")}>
      <span aria-hidden="true">{type === "buy" ? "▲" : "▼"} </span>
      {type === "buy" ? "Buy" : "Sell"}
    </span>
  );
}

/** A row of log tabs: stamped labels, accent underline when active. */
function FilterTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T | null; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1" role="group" aria-label={label}>
      <span className="stamp mr-2 text-fg-subtle">{label}</span>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "stamp whitespace-nowrap border-b-2 px-2 py-1.5 transition-colors",
              active ? "border-accent text-fg" : "border-transparent text-fg-subtle hover:text-fg"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function TransactionRow({ t, showFiler }: { t: DisclosureTransaction; showFiler: boolean }) {
  return (
    <LogRow>
      <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1.5 sm:grid-cols-[7.5rem_4rem_minmax(0,1fr)_7.5rem]">
        <span className="fix-stamp order-1 text-xs text-fg-muted sm:order-none">
          {formatDisclosureDate(t.date, t.datePrecision)}
        </span>
        <span className="order-2 justify-self-end sm:order-none sm:justify-self-auto">
          <SideMark type={t.type} />
        </span>
        <div className="order-3 col-span-2 min-w-0 sm:order-none sm:col-span-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            {t.symbol ? <span className="stamp-lg text-fg">{t.symbol}</span> : null}
            <span className={cn("text-sm", t.symbol ? "text-fg-muted" : "text-fg")}>{t.asset}</span>
            <span className="stamp text-fg-subtle">{ASSET_CLASS_LABELS[t.assetClass]}</span>
          </p>
          {t.context ? <p className="mt-1 max-w-prose text-sm text-fg-subtle">{t.context}</p> : null}
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
            {showFiler ? <span className="stamp text-fg-subtle">{filerName(t.filerId)}</span> : null}
            <SourceLink source={t.source} />
          </p>
        </div>
        <span
          className={cn(
            "figure order-4 col-span-2 text-sm sm:order-none sm:col-span-1 sm:text-right",
            t.amountMin === null && t.amountMax === null ? "text-fg-subtle" : "font-medium text-fg"
          )}
        >
          <span className="stamp mr-2 text-fg-subtle sm:hidden">Amount</span>
          {formatAmountRange(t.amountMin, t.amountMax)}
        </span>
      </div>
    </LogRow>
  );
}

export function DisclosureTracker() {
  const positions = usePositionStore((s) => s.positions);
  const watchlist = usePositionStore((s) => s.watchlist);

  const [filerId, setFilerId] = useState<string | null>(null);
  const [type, setType] = useState<TransactionType | null>(null);
  const [assetClass, setAssetClass] = useState<AssetClass | null>(null);

  const shown = useMemo(
    () => filterTransactions(transactions, { filerId, type, assetClass }),
    [filerId, type, assetClass]
  );

  const heldIdBySymbol = useMemo(
    () => new Map(positions.filter((p) => p.status === "open").map((p) => [normalizeSymbol(p.symbol), p.id])),
    [positions]
  );

  const overlap = useMemo(
    () =>
      findBookOverlap(disclosureDataset, [
        ...positions.filter((p) => p.status === "open").map((p) => ({ symbol: p.symbol, relation: "held" as const })),
        ...watchlist.map((w) => ({ symbol: w.symbol, relation: "watched" as const })),
      ]),
    [positions, watchlist]
  );

  const buys = transactions.filter((t) => t.type === "buy");
  const sells = transactions.filter((t) => t.type === "sell");
  const buyTotal = sumRanges(buys);

  return (
    <div>
      <BandRaw label="Disclosures">
        <p className="stamp text-fg-subtle">Logged buys, reported bands</p>
        <p className="figure mt-2 text-3xl font-semibold tracking-tight text-fg sm:text-[1.875rem]">
          {formatCompactUsd(buyTotal.min)}–{formatCompactUsd(buyTotal.max)}
        </p>
        <p className="fix-stamp mt-3 text-xs text-fg-muted">
          {transactions.length} trades · {buys.length} buys · {sells.length} sells
          {buyTotal.unpriced > 0 ? ` · ${buyTotal.unpriced} buys with no band reported` : ""}
        </p>
        <p className="fix-stamp mt-1 text-xs text-fg-subtle">
          Log updated {formatDisclosureDate(updatedAt, "day")}
        </p>
        <div className="mt-5 max-w-prose space-y-2 text-sm text-fg-muted">
          <p>{coverageNote}</p>
          <p>
            Trades are filed 30–45 days after they happen, and every amount is the filing&apos;s reporting
            band, not an exact figure. Read this as a record of what was disclosed, not as a signal to copy, and not
            as investment advice.
          </p>
        </div>
      </BandRaw>

      <Band title="On your sheet" meta="Held & watched symbols in the filings">
        {overlap.length === 0 ? (
          <EmptyEntry
            title="No overlap with your book"
            description="None of your outstanding shares or watchlist symbols show up in the logged disclosures."
          />
        ) : (
          <div>
            {overlap.map((o) => (
              <LogRow key={o.symbol}>
                <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 sm:grid-cols-[8rem_6rem_minmax(0,1fr)]">
                  <span className="stamp-lg text-fg">
                    {heldIdBySymbol.has(o.symbol) ? (
                      <Link
                        href={`/positions/${heldIdBySymbol.get(o.symbol)}`}
                        className="transition-colors hover:text-accent"
                      >
                        {o.symbol}
                      </Link>
                    ) : (
                      o.symbol
                    )}
                    <span className="stamp ml-2 text-fg-subtle">{o.relation}</span>
                  </span>
                  <span className="fix-stamp justify-self-end text-xs text-fg-muted sm:justify-self-auto">
                    <span className="text-gain">▲{o.buys.length}</span>{" "}
                    <span className="text-loss">▼{o.sells.length}</span>
                    <span className="sr-only">
                      {o.buys.length} buys, {o.sells.length} sells
                    </span>
                  </span>
                  <p className="col-span-2 text-sm text-fg-muted sm:col-span-1">
                    {o.latest ? (
                      <>
                        Latest: <SideMark type={o.latest.type} />{" "}
                        {o.latest.amountMin === null && o.latest.amountMax === null ? (
                          <span className="text-fg-subtle">(amount not reported)</span>
                        ) : (
                          <span className="text-fg">{formatAmountRange(o.latest.amountMin, o.latest.amountMax)}</span>
                        )}{" "}
                        by {filerName(o.latest.filerId)},{" "}
                        <span className="fix-stamp text-xs">
                          {formatDisclosureDate(o.latest.date, o.latest.datePrecision)}
                        </span>
                      </>
                    ) : (
                      <>
                        Reported holding:{" "}
                        {o.holdings.map((h) => `${filerName(h.filerId)}, ${formatAmountRange(h.amountMin, h.amountMax)}`).join("; ")}
                      </>
                    )}
                  </p>
                </div>
              </LogRow>
            ))}
          </div>
        )}
      </Band>

      <Band title="Trades" meta={`${shown.length} of ${transactions.length} shown`}>
        <div className="mb-4 space-y-1 border-b border-rule pb-3">
          {tradingFilers.length > 1 ? (
            <FilterTabs
              label="Filer"
              value={filerId}
              onChange={setFilerId}
              options={[{ value: null, label: "All" }, ...tradingFilers.map((f) => ({ value: f.id, label: f.name }))]}
            />
          ) : null}
          <FilterTabs<TransactionType>
            label="Side"
            value={type}
            onChange={setType}
            options={[
              { value: null, label: "All" },
              { value: "buy", label: "Buys" },
              { value: "sell", label: "Sells" },
            ]}
          />
          <FilterTabs<AssetClass>
            label="Class"
            value={assetClass}
            onChange={setAssetClass}
            options={[{ value: null, label: "All" }, ...tradedClasses.map((c) => ({ value: c, label: ASSET_CLASS_LABELS[c] }))]}
          />
        </div>

        {shown.length === 0 ? (
          <EmptyEntry title="No trades match" description="Clear a filter to see the rest of the log." />
        ) : (
          <div>
            <div className="stamp hidden border-b border-rule pb-2 text-fg-subtle sm:grid sm:grid-cols-[7.5rem_4rem_minmax(0,1fr)_7.5rem]">
              <span>Date</span>
              <span>Side</span>
              <span>Asset</span>
              <span className="text-right">Amount</span>
            </div>
            {shown.map((t) => (
              <TransactionRow key={t.id} t={t} showFiler={tradingFilers.length > 1 || filerId === null} />
            ))}
          </div>
        )}
      </Band>

      <Band title="Filings" meta="Whole-report totals">
        <div className="stamp hidden border-b border-rule pb-2 text-fg-subtle sm:grid sm:grid-cols-[minmax(0,1fr)_6rem_9rem_9rem]">
          <span>Period</span>
          <span className="text-right">Trades</span>
          <span className="text-right">Buys / sells</span>
          <span className="text-right">Value</span>
        </div>
        {filings.map((f) => (
          <LogRow key={f.id}>
            <div className="grid grid-cols-2 items-baseline gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_6rem_9rem_9rem]">
              <div className="col-span-2 sm:col-span-1">
                <p className="text-sm text-fg">{f.periodLabel}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-3">
                  <span className="stamp text-fg-subtle">{filerName(f.filerId)}</span>
                  <SourceLink source={f.source} />
                </p>
              </div>
              <span className="figure text-sm text-fg sm:text-right">
                <span className="stamp mr-2 text-fg-subtle sm:hidden">Trades</span>
                {f.trades === null ? "Not reported" : `${f.tradesIsFloor ? "> " : ""}${f.trades.toLocaleString("en-US")}`}
              </span>
              <span className={cn("figure text-sm sm:text-right", f.buys === null ? "text-fg-subtle" : "text-fg-muted")}>
                <span className="stamp mr-2 text-fg-subtle sm:hidden">Buys / sells</span>
                {f.buys === null || f.sells === null
                  ? "Not split"
                  : `${f.buys.toLocaleString("en-US")} / ${f.sells.toLocaleString("en-US")}`}
              </span>
              <span
                className={cn(
                  "figure col-span-2 text-sm sm:col-span-1 sm:text-right",
                  f.valueMin === null && f.valueMax === null ? "text-fg-subtle" : "font-medium text-fg"
                )}
              >
                <span className="stamp mr-2 text-fg-subtle sm:hidden">Value</span>
                {formatAmountRange(f.valueMin, f.valueMax)}
              </span>
            </div>
          </LogRow>
        ))}
        <p className="mt-3 max-w-prose text-sm text-fg-subtle">
          Periods not listed here (Apr–May 2026, Sep 2026 onward) are not yet logged — the filings themselves are on
          the{" "}
          <a
            href="https://projects.propublica.org/trump-team-financial-disclosures/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-rule-strong underline-offset-2 hover:text-fg"
          >
            ProPublica disclosure database
          </a>
          .
        </p>
      </Band>

      <Band title="Holdings" meta="From annual reports">
        {holdings.map((h) => {
          const filer = filerById.get(h.filerId);
          return (
            <LogRow key={h.id}>
              <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 sm:grid-cols-[12rem_minmax(0,1fr)_7.5rem]">
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-sm text-fg">{filer?.name ?? h.filerId}</p>
                  {filer ? <p className="stamp mt-0.5 text-fg-subtle">{filer.role}</p> : null}
                </div>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    {h.symbol ? <span className="stamp-lg text-fg">{h.symbol}</span> : null}
                    <span className={cn("text-sm", h.symbol ? "text-fg-muted" : "text-fg")}>{h.asset}</span>
                  </p>
                  {h.context ? <p className="mt-1 max-w-prose text-sm text-fg-subtle">{h.context}</p> : null}
                  <p className="mt-1 flex flex-wrap gap-x-3">
                    <span className="fix-stamp text-xs text-fg-subtle">As of {formatDisclosureDate(h.asOf, "day")}</span>
                    <SourceLink source={h.source} />
                  </p>
                </div>
                <span
                  className={cn(
                    "figure text-sm sm:text-right",
                    h.amountMin === null && h.amountMax === null ? "text-fg-subtle" : "font-medium text-fg"
                  )}
                >
                  {formatAmountRange(h.amountMin, h.amountMax)}
                </span>
              </div>
            </LogRow>
          );
        })}
      </Band>
    </div>
  );
}
