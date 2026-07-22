"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useHydrated } from "@/hooks/useHydrated";
import { usePositionStore } from "@/store/usePositionStore";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PositionForm } from "@/components/form/PositionForm";

export default function EditPositionPage() {
  const params = useParams<{ id: string }>();
  const hydrated = useHydrated();
  const positions = usePositionStore((s) => s.positions);

  if (!hydrated) return <Skeleton className="h-96" />;

  const position = positions.find((p) => p.id === params.id);
  if (!position) {
    return (
      <EmptyState
        title="Position not found"
        action={
          <Link href="/">
            <Button>Back to dashboard</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-medium text-fg">Edit Position — {position.symbol}</h1>
      <PositionForm existingPosition={position} />
    </div>
  );
}
