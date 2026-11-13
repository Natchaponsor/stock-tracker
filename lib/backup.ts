import { formatAgo } from "./priceTime";

/** Days without a JSON export before the Data menu and Settings nudge for a backup. */
export const BACKUP_REMINDER_DAYS = 14;

const DAY_MS = 24 * 60 * 60_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface BackupStatus {
  /** True when there is something to lose and the last backup is too old (or never happened). */
  due: boolean;
  /** "Last backup Nov 2 · 7 days ago", or "No backup yet". */
  label: string;
}

/**
 * Whether the book needs backing up. The book lives only in this browser, so
 * the reminder counts from the last JSON export, or, if there has never been
 * one, from when this book started (first load, reset, erase or import), so a
 * fresh book gets the same grace period instead of a nudge on day one.
 * `now` is null until mounted: nothing is due then, which keeps the server
 * render and the first client render the same.
 */
export function backupStatus({
  lastExportedAt,
  bookStartedAt,
  hasData,
  now,
}: {
  lastExportedAt: string | null;
  bookStartedAt: string | null;
  hasData: boolean;
  now: number | null;
}): BackupStatus {
  const exported = lastExportedAt ? new Date(lastExportedAt) : null;
  const label =
    exported === null
      ? "No backup yet"
      : `Last backup ${MONTHS[exported.getMonth()]} ${exported.getDate()}${
          now === null ? "" : ` · ${formatAgo(now - exported.getTime())}`
        }`;

  const since = lastExportedAt ?? bookStartedAt;
  if (!hasData || now === null || since === null) return { due: false, label };
  const age = now - new Date(since).getTime();
  return { due: Number.isFinite(age) && age >= BACKUP_REMINDER_DAYS * DAY_MS, label };
}
