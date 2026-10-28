import { describe, expect, it } from "vitest";
import { formatAgo, formatAsOf, formatClock } from "../priceTime";

// Local-time constructors, so these hold in any timezone. Oct 27 2026 is a Tuesday.
const at = (y: number, mo: number, d: number, h: number, mi: number) => new Date(y, mo - 1, d, h, mi);
const NOW = at(2026, 10, 27, 10, 18);

describe("formatClock", () => {
  it("uses a 12-hour clock with AM/PM", () => {
    expect(formatClock(at(2026, 10, 27, 10, 17))).toBe("10:17 AM");
    expect(formatClock(at(2026, 10, 23, 16, 0))).toBe("4:00 PM");
    expect(formatClock(at(2026, 10, 23, 0, 5))).toBe("12:05 AM");
    expect(formatClock(at(2026, 10, 23, 12, 30))).toBe("12:30 PM");
  });
});

describe("formatAsOf", () => {
  it("shows only the time for a price from today", () => {
    expect(formatAsOf(at(2026, 10, 27, 10, 17), NOW)).toBe("10:17 AM");
  });

  it("shows the weekday for a price from earlier this week", () => {
    expect(formatAsOf(at(2026, 10, 23, 16, 0), NOW)).toBe("Fri 4:00 PM");
    expect(formatAsOf(at(2026, 10, 26, 16, 0), NOW)).toBe("Mon 4:00 PM");
  });

  it("switches to the date once the price is a week or more old", () => {
    expect(formatAsOf(at(2026, 10, 20, 16, 0), NOW)).toBe("Oct 20, 4:00 PM");
  });

  it("adds the year when the price is from a different year", () => {
    expect(formatAsOf(at(2025, 12, 31, 16, 0), NOW)).toBe("Dec 31, 2025, 4:00 PM");
  });

  it("always includes the date when 'now' is not known yet", () => {
    expect(formatAsOf(at(2026, 10, 27, 10, 17), null)).toBe("Oct 27, 2026, 10:17 AM");
  });
});

describe("formatAgo", () => {
  it("reads in plain units", () => {
    expect(formatAgo(20_000)).toBe("just now");
    expect(formatAgo(60_000)).toBe("1 min ago");
    expect(formatAgo(59 * 60_000)).toBe("59 min ago");
    expect(formatAgo(3 * 60 * 60_000 + 40 * 60_000)).toBe("3 hr ago");
    expect(formatAgo(26 * 60 * 60_000)).toBe("1 day ago");
    expect(formatAgo(3 * 24 * 60 * 60_000)).toBe("3 days ago");
  });

  it("never goes negative on a small clock skew", () => {
    expect(formatAgo(-5_000)).toBe("just now");
  });
});
