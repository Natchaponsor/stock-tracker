/**
 * Parses a plain "YYYY-MM-DD" (e.g. from an <input type="date">) as local midnight.
 * `new Date("YYYY-MM-DD")` parses as UTC midnight per spec, which then displays as
 * the previous day in any timezone behind UTC — this avoids that off-by-one.
 */
export function parseDateInputAsLocal(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

/** Today's date as a "YYYY-MM-DD" string in the local timezone, for <input type="date"> defaults. */
export function todayDateInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
