"use client";

import { usePositionStore } from "@/store/usePositionStore";

export function useHydrated() {
  return usePositionStore((s) => s.hasHydrated);
}
