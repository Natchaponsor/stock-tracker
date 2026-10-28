const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 24 * 60 * 60_000;

/**
 * "10:17 AM". Built by hand rather than with toLocaleTimeString, which puts a
 * narrow no-break space before AM/PM on some runtimes and not others.
 */
export function formatClock(d: Date): string {
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/**
 * When a price is from, in the plainest form that is still unambiguous:
 * the time alone if it is from today, the weekday within the past week
 * ("Fri 4:00 PM"), otherwise the date ("Oct 3, 4:00 PM"). With no `now`
 * (not mounted yet) the date is always included, since "today" is unknown.
 */
export function formatAsOf(asOf: Date, now: Date | null): string {
  const clock = formatClock(asOf);
  if (now !== null) {
    if (asOf.toDateString() === now.toDateString()) return clock;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const daysBack = Math.ceil((startOfToday - asOf.getTime()) / DAY_MS);
    if (daysBack >= 1 && daysBack <= 6) return `${WEEKDAYS[asOf.getDay()]} ${clock}`;
  }
  const year = now !== null && asOf.getFullYear() === now.getFullYear() ? "" : `, ${asOf.getFullYear()}`;
  return `${MONTHS[asOf.getMonth()]} ${asOf.getDate()}${year}, ${clock}`;
}

/** "just now", "12 min ago", "3 hr ago", "2 days ago". */
export function formatAgo(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
