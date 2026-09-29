import { addDays, format, getDay } from "date-fns";

/** The next Monday–Friday after `d` (Fri → Mon). No court-holiday logic: dates stay staff-editable. */
export function nextBusinessDay(d: Date): Date {
  let next = addDays(d, 1);
  while (getDay(next) === 0 || getDay(next) === 6) next = addDays(next, 1);
  return next;
}

export const ymd = (d: Date) => format(d, "yyyy-MM-dd");
