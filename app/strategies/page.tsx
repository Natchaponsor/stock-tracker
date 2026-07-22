"use client";

import { useHydrated } from "@/hooks/useHydrated";
import { Skeleton } from "@/components/ui/Skeleton";
import { StrategyManager } from "@/components/strategy/StrategyManager";

export default function StrategiesPage() {
  const hydrated = useHydrated();

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-medium text-fg">Strategies</h1>
      {hydrated ? <StrategyManager /> : <Skeleton className="h-64" />}
    </div>
  );
}
