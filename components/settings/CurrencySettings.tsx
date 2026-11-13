"use client";

import { NsCard } from "@/components/navy/primitives";
import { Segmented } from "@/components/ui/Segmented";
import { CurrencySelect } from "@/components/fx/FxBits";
import { SettingRow } from "@/components/settings/SettingRow";
import { usePositionStore } from "@/store/usePositionStore";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";
import { usePortfolioSummary } from "@/hooks/usePortfolioSummary";
import { formatCurrency } from "@/lib/format";
import { FX_CURRENCIES, formatRate, formatRateDate } from "@/lib/fx";

/**
 * Which currency the dashboard totals show in, and which second currency the
 * USD | THB flip offers. Both are this device's choice and never sync.
 */
export function CurrencySettings() {
  const setHomeCurrency = usePositionStore((s) => s.setHomeCurrency);
  const hidePnl = usePositionStore((s) => s.hidePnl);
  const display = useDisplayCurrency();
  const { total } = usePortfolioSummary();
  const options = ["USD", display.alt] as const;

  return (
    <NsCard title="Currency" meta="This device only">
      <SettingRow
        title="Show portfolio totals in"
        description="The portfolio value, cash, positions and change at the top of the dashboard. You can also flip it there."
      >
        <Segmented
          options={options}
          value={display.wantsAlt ? display.alt : "USD"}
          onChange={(code) => display.setChoice(code === "USD" ? "USD" : "home")}
        />
      </SettingRow>
      <SettingRow
        title="Second currency"
        description="The currency you live in. It's also your home currency on the FX page."
      >
        <CurrencySelect
          label="Second currency"
          value={display.alt}
          onChange={setHomeCurrency}
          exclude="USD"
          className="w-full @lg:w-60"
        />
      </SettingRow>

      <div className="mt-4 rounded-ns-md bg-ns-sunken px-4 py-3">
        <p className="ns-label text-ns-ink-muted">Your portfolio today</p>
        <p className="ns-amount-md oc-num mt-1 text-ns-ink">
          {hidePnl ? (
            "••••••"
          ) : (
            <>
              {formatCurrency(total)}
              <span className="text-ns-ink-subtle"> ≈ </span>
              {display.fx ? formatCurrency(total * display.fx.rate, { currency: display.alt }) : "…"}
            </>
          )}
        </p>
        <p className="ns-caption mt-1 font-normal text-ns-ink-muted">
          {display.fx
            ? `1 USD = ${formatRate(display.fx.rate)} ${display.alt} · daily reference rate, ${formatRateDate(display.fx.date)}, before any bank spread`
            : `Getting the USD/${display.alt} rate (${FX_CURRENCIES[display.alt] ?? display.alt})…`}
        </p>
      </div>
      <p className="ns-caption mt-3 font-normal text-ns-ink-subtle">
        Share prices, fills and profit &amp; loss stay in US dollars, the currency you trade in.
      </p>
    </NsCard>
  );
}
