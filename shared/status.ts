import { differenceInCalendarDays } from "date-fns";

/**
 * Status vocabulary shared by client and server.
 * Every status renders as text label + icon + color (never color alone).
 */
export type Status = "overdue" | "soon" | "ok" | "stale";

/** A deadline is "due soon" when it falls within this many days (inclusive). */
export const SOON_WINDOW_DAYS = 7;
/** A case is "stale" when untouched for more than this many days. */
export const STALE_AFTER_DAYS = 365;

export const STATUS_LABELS: Record<Status, string> = {
  overdue: "Overdue",
  soon: "Due soon",
  ok: "On track",
  stale: "Stale",
};

/** Whole calendar days from `today` until `due` (negative = overdue). */
export function daysUntil(due: Date, today: Date): number {
  return differenceInCalendarDays(due, today);
}

export function deadlineStatus(
  due: Date,
  today: Date
): Exclude<Status, "stale"> {
  const days = daysUntil(due, today);
  if (days < 0) return "overdue";
  if (days <= SOON_WINDOW_DAYS) return "soon";
  return "ok";
}

export function isStale(lastTouched: Date, today: Date): boolean {
  return differenceInCalendarDays(today, lastTouched) > STALE_AFTER_DAYS;
}

/** "in 3 days" / "today" / "2 days overdue" */
export function relativeDueLabel(due: Date, today: Date): string {
  const days = daysUntil(due, today);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 1) return `in ${days} days`;
  if (days === -1) return "1 day overdue";
  return `${-days} days overdue`;
}
