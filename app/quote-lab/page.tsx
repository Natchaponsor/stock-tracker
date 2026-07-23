"use client";

/**
 * Quote Lab — an isolated, manual-only test harness for the Yahoo quote proxy.
 *
 * Deliberately does NOT use SWR, polling, or any auto-refresh: every fetch is a
 * single explicit button click, so you can try a new/unfamiliar ticker and see
 * exactly how many requests you've sent and what came back — without the rest
 * of the app's background refresh adding to Yahoo's rate limit in parallel.
 *
 * Not linked from the main nav on purpose. Visit /quote-lab directly.
 */

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, inputClass } from "@/components/form/FormField";
import { formatCurrency, formatPct, glyph } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Quote } from "@/lib/types";

interface LogEntry {
  id: number;
  symbol: string;
  requestedAt: string;
  quote: Quote | null;
  error: string | null;
}

export default function QuoteLabPage() {
  const [symbol, setSymbol] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [qty, setQty] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  const latest = log[0] ?? null;

  const price = latest?.quote?.price ?? null;
  const parsedEntry = parseFloat(entryPrice);
  const parsedQty = parseFloat(qty);
  const hasInputs = Number.isFinite(parsedEntry) && Number.isFinite(parsedQty) && parsedQty > 0;

  const unrealizedPnl = price !== null && hasInputs ? (price - parsedEntry) * parsedQty : null;
  const returnPct =
    unrealizedPnl !== null && parsedEntry > 0 ? unrealizedPnl / (parsedEntry * parsedQty) : null;

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    const upperSymbol = symbol.trim().toUpperCase();
    if (!upperSymbol || loading) return;

    setLoading(true);
    const requestedAt = new Date().toISOString();
    try {
      const res = await fetch(`/api/quote?symbols=${encodeURIComponent(upperSymbol)}`);
      const data: Quote[] = await res.json();
      const quote = data[0] ?? null;
      setLog((prev) => [
        {
          id: Date.now(),
          symbol: upperSymbol,
          requestedAt,
          quote,
          error: quote?.error ?? (quote?.price === null ? "no data" : null),
        },
        ...prev,
      ]);
    } catch {
      setLog((prev) => [
        { id: Date.now(), symbol: upperSymbol, requestedAt, quote: null, error: "fetch failed" },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="font-serif text-2xl font-medium text-fg">Quote Lab</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Manual, one-shot quote testing — nothing here auto-refreshes. Every fetch below is a single
          request you trigger yourself, so you can see exactly how Yahoo responds to a symbol before
          adding it to your real portfolio. Requests made this session: <b className="text-fg">{log.length}</b>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Test a symbol</CardTitle>
            <CardSubtitle>One request per click — nothing runs in the background</CardSubtitle>
          </div>
        </CardHeader>
        <form onSubmit={handleFetch} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FormField label="Symbol">
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="MRVL"
              className={inputClass}
            />
          </FormField>
          <FormField label="Hypothetical entry" hint="optional, for P&L">
            <input
              type="number"
              step="0.01"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Qty" hint="optional, for P&L">
            <input
              type="number"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <div className="flex items-end">
            <Button type="submit" variant="primary" disabled={loading || !symbol.trim()} className="w-full">
              {loading ? "Fetching…" : "Fetch quote"}
            </Button>
          </div>
        </form>
      </Card>

      {latest && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{latest.symbol}</CardTitle>
              <CardSubtitle>Requested {new Date(latest.requestedAt).toLocaleTimeString()}</CardSubtitle>
            </div>
          </CardHeader>
          {latest.error ? (
            <p className="text-sm text-loss">
              Unavailable — <span className="text-fg-muted">{latest.error}</span>
              {latest.error.includes("429") && (
                <span className="block mt-1 text-fg-subtle">
                  That&apos;s Yahoo rate-limiting the proxy, not a problem with this symbol. Wait a bit and try again.
                </span>
              )}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Price</p>
                <p className="font-serif text-xl text-fg">{formatCurrency(latest.quote!.price!)}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Day change</p>
                <p className={cn("text-sm font-medium", (latest.quote!.changePct ?? 0) >= 0 ? "text-gain" : "text-loss")}>
                  {latest.quote!.changePct !== null
                    ? `${glyph(latest.quote!.changePct!)} ${Math.abs(latest.quote!.changePct!).toFixed(2)}%`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Unrealized P&L</p>
                {unrealizedPnl !== null ? (
                  <p className={cn("text-sm font-medium", unrealizedPnl >= 0 ? "text-gain" : "text-loss")}>
                    {formatCurrency(unrealizedPnl, { signed: true })}
                  </p>
                ) : (
                  <p className="text-sm text-fg-subtle">enter price + qty</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Return</p>
                <p className="text-sm text-fg-muted">{returnPct !== null ? formatPct(returnPct, { signed: true }) : "—"}</p>
              </div>
            </div>
          )}
        </Card>
      )}

      {log.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Request log</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border text-sm">
            {log.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between py-2">
                <span className="font-medium text-fg">{entry.symbol}</span>
                <span className="text-fg-subtle">{new Date(entry.requestedAt).toLocaleTimeString()}</span>
                <span className={entry.error ? "text-loss" : "text-gain"}>
                  {entry.error ? entry.error : formatCurrency(entry.quote?.price ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
