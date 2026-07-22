"use client";

import { useHydrated } from "@/hooks/useHydrated";
import { Skeleton } from "@/components/ui/Skeleton";
import { PositionForm } from "@/components/form/PositionForm";

export default function NewPositionPage() {
  const hydrated = useHydrated();

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-medium text-fg">Log Position</h1>
      {hydrated ? <PositionForm /> : <Skeleton className="h-96" />}
    </div>
  );
}
