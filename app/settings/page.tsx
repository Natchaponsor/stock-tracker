"use client";

import { useHydrated } from "@/hooks/useHydrated";
import { NsSkeleton } from "@/components/navy/primitives";
import { CurrencySettings } from "@/components/settings/CurrencySettings";
import { DataSettings } from "@/components/settings/DataSettings";
import { DeviceSettings } from "@/components/settings/DeviceSettings";

export default function SettingsPage() {
  const hydrated = useHydrated();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="ns-title text-ns-ink">Settings</h1>
        <p className="ns-caption mt-0.5 text-ns-ink-muted">Currency, your data, and the devices that share it.</p>
      </header>

      {!hydrated ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <NsSkeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid max-w-3xl items-start gap-5 xl:max-w-none xl:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-5">
            <CurrencySettings />
            <DataSettings />
          </div>
          <div className="min-w-0">
            <DeviceSettings />
          </div>
        </div>
      )}
    </div>
  );
}
