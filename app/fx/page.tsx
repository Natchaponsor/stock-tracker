"use client";

import { useHydrated } from "@/hooks/useHydrated";
import { usePositionStore } from "@/store/usePositionStore";
import { NsSkeleton } from "@/components/navy/primitives";
import { CurrencySelect, FxSectionSwitch } from "@/components/fx/FxBits";
import { FxAlertCallout } from "@/components/fx/FxAlertCallout";
import { FxWatchlist } from "@/components/fx/FxWatchlist";
import { FxConverter } from "@/components/fx/FxConverter";
import { FxPushCard } from "@/components/fx/FxPushCard";

export default function FxPage() {
  const hydrated = useHydrated();
  const home = usePositionStore((s) => s.homeCurrency);
  const setHomeCurrency = usePositionStore((s) => s.setHomeCurrency);

  return (
    <div className="space-y-5">
      <FxSectionSwitch />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ns-title text-ns-ink">FX</h1>
          <p className="ns-caption mt-0.5 text-ns-ink-muted">Exchange rates for the currencies you live and invest in.</p>
        </div>
        {hydrated && (
          <label className="w-full max-w-[260px]">
            <span className="oc-field-label">Home currency (this device)</span>
            <CurrencySelect label="Home currency" value={home} onChange={setHomeCurrency} />
          </label>
        )}
      </header>

      {!hydrated ? (
        <NsSkeleton className="h-64 w-full" />
      ) : (
        <>
          <FxAlertCallout />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <FxWatchlist />
            </div>
            <div className="min-w-0 space-y-5">
              <FxConverter defaultFrom="USD" defaultTo={home === "USD" ? "THB" : home} />
              <FxPushCard />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
