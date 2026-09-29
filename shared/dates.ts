import { addDays, format, getDay } from "date-fns";

/** The next Monday–Friday after `d` (Fri → Mon). No court-holiday logic: dates stay staff-editable. */
export function nextBusinessDay(d: Date): Date {
  let next = addDays(d, 1);
  while (getDay(next) === 0 || getDay(next) === 6) next = addDays(next, 1);
  return next;
}

export const ymd = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * A heads-up (never a block or an auto-move: court-rule dates stay staff-entered)
 * when a chosen date falls on a weekend. Returns null on weekdays.
 */
export function weekendWarning(ymdDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymdDate)) return null;
  const day = new Date(`${ymdDate}T12:00:00`).getDay();
  if (day !== 0 && day !== 6) return null;
  return `That's a ${day === 6 ? "Saturday" : "Sunday"}. Courts are closed on weekends, so double-check the date.`;
}
