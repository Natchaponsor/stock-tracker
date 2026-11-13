"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useHydrated } from "@/hooks/useHydrated";
import { NsEmpty, NsSkeleton } from "@/components/navy/primitives";
import { FxSectionSwitch } from "@/components/fx/FxBits";
import { FxAlertCallout } from "@/components/fx/FxAlertCallout";
import { FxPairDetail } from "@/components/fx/FxPairDetail";
import { pairFromSlug } from "@/lib/fx";

export default function FxPairPage() {
  const params = useParams<{ pair: string }>();
  const pair = pairFromSlug(params.pair ?? "");
  const hydrated = useHydrated();

  return (
    <div className="space-y-5">
      <FxSectionSwitch />
      <Link href="/fx" className="oc-link inline-flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        All pairs
      </Link>
      {!pair ? (
        <NsEmpty title="That isn't a currency pair" description="Pair links look like /fx/usd-thb." />
      ) : !hydrated ? (
        <NsSkeleton className="h-96 w-full" />
      ) : (
        <>
          <FxAlertCallout pair={pair} />
          <FxPairDetail pair={pair} />
        </>
      )}
    </div>
  );
}
