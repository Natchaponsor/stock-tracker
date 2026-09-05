"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useHydrated } from "@/hooks/useHydrated";
import { Skeleton } from "@/components/ui/Skeleton";
import { BuyForm } from "@/components/form/BuyForm";
import { SellForm } from "@/components/form/SellForm";

function NewPositionContent() {
  const hydrated = useHydrated();
  const mode = useSearchParams().get("mode") === "sell" ? "sell" : "buy";

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-medium text-fg">{mode === "sell" ? "Sell Shares" : "Buy Shares"}</h1>
      {hydrated ? mode === "sell" ? <SellForm /> : <BuyForm /> : <Skeleton className="h-96" />}
    </div>
  );
}

export default function NewPositionPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <NewPositionContent />
    </Suspense>
  );
}
