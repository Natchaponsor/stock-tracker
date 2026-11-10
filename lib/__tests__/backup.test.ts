import { describe, expect, it } from "vitest";
import { BACKUP_REMINDER_DAYS, backupStatus } from "../backup";

const DAY = 24 * 60 * 60_000;
// Local-time constructor, so the label's date holds in any timezone.
const NOW = new Date(2026, 10, 9, 12, 0).getTime();
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

describe("backupStatus", () => {
  it("is not due inside the reminder window", () => {
    const s = backupStatus({ lastExportedAt: daysAgo(3), bookStartedAt: daysAgo(40), hasData: true, now: NOW });
    expect(s.due).toBe(false);
    expect(s.label).toBe("Last backup Nov 6 · 3 days ago");
  });

  it("is due once the last export is old enough", () => {
    const s = backupStatus({
      lastExportedAt: daysAgo(BACKUP_REMINDER_DAYS),
      bookStartedAt: daysAgo(40),
      hasData: true,
      now: NOW,
    });
    expect(s.due).toBe(true);
  });

  it("gives a never-exported book the same grace period from when it started", () => {
    expect(backupStatus({ lastExportedAt: null, bookStartedAt: daysAgo(2), hasData: true, now: NOW }).due).toBe(false);
    const late = backupStatus({ lastExportedAt: null, bookStartedAt: daysAgo(20), hasData: true, now: NOW });
    expect(late.due).toBe(true);
    expect(late.label).toBe("No backup yet");
  });

  it("never nags about an empty book", () => {
    expect(backupStatus({ lastExportedAt: null, bookStartedAt: daysAgo(90), hasData: false, now: NOW }).due).toBe(false);
  });

  it("stays quiet until mounted", () => {
    const s = backupStatus({ lastExportedAt: daysAgo(30), bookStartedAt: daysAgo(90), hasData: true, now: null });
    expect(s.due).toBe(false);
    expect(s.label).toBe("Last backup Oct 10");
  });
});
