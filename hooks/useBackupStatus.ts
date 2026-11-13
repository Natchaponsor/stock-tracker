"use client";

import { usePositionStore } from "@/store/usePositionStore";
import { backupStatus } from "@/lib/backup";
import { useNow } from "@/components/log/clock";

/** Whether the book is due a JSON backup, for Settings and the dot on its link. */
export function useBackupStatus() {
  const lastExportedAt = usePositionStore((s) => s.lastExportedAt);
  const bookStartedAt = usePositionStore((s) => s.bookStartedAt);
  const hasData = usePositionStore((s) => s.positions.length > 0 || s.cashDeposits.length > 0);
  const now = useNow();
  return backupStatus({ lastExportedAt, bookStartedAt, hasData, now });
}
