"use client";

import { useHydrated } from "@/hooks/useHydrated";
import { Skeleton } from "@/components/ui/Skeleton";
import { DisclosureTracker } from "@/components/disclosures/DisclosureTracker";

export default function DisclosuresPage() {
  // The overlap band reads the reader's own book from localStorage.
  const hydrated = useHydrated();

  return (
    <div>
      <h1 className="sr-only">Disclosures</h1>
      {hydrated ? <DisclosureTracker /> : <Skeleton className="mt-7 h-64" />}
    </div>
  );
}
