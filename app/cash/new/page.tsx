"use client";

import { useHydrated } from "@/hooks/useHydrated";
import { Skeleton } from "@/components/ui/Skeleton";
import { CashDepositForm } from "@/components/form/CashDepositForm";

export default function AddCashPage() {
  const hydrated = useHydrated();
  return (
    <div className="space-y-6">
      <h1 className="ns-title text-ns-ink">Add Cash</h1>
      {hydrated ? <CashDepositForm /> : <Skeleton className="h-96" />}
    </div>
  );
}
