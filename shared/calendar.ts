import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ymd } from "./dates";

/** Calendar views. Weeks run Monday–Sunday, like a desk calendar. */
export type CalendarView = "week" | "3weeks" | "month";
export const CALENDAR_VIEWS: { id: CalendarView; label: string }[] = [
  { id: "week", label: "1 week" },
  { id: "3weeks", label: "3 weeks" },
  { id: "month", label: "Month" },
];

const MONDAY = { weekStartsOn: 1 as const };

export type CalendarDay = { date: string; inRange: boolean };

/** The days to draw for a view around `anchor` (always whole weeks). */
export function calendarDays(view: CalendarView, anchor: Date): CalendarDay[] {
  let start: Date;
  let end: Date;
  if (view === "month") {
    start = startOfWeek(startOfMonth(anchor), MONDAY);
    end = endOfWeek(endOfMonth(anchor), MONDAY);
  } else if (view === "week") {
    start = startOfWeek(anchor, MONDAY);
    end = addDays(start, 6);
  } else {
    // "3 weeks" = the next 21 days (today + 20, same window as the dashboard
    // strip), padded to whole Mon–Sun weeks. Mid-week that is 4 rows, so the
    // third-week Monday is never cut off.
    start = startOfWeek(anchor, MONDAY);
    end = endOfWeek(addDays(anchor, 20), MONDAY);
  }
  const days: CalendarDay[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    days.push({
      date: ymd(d),
      inRange: view !== "month" || isSameMonth(d, anchor),
    });
  }
  return days;
}

/** Previous/next page for the arrows. */
export function shiftAnchor(
  view: CalendarView,
  anchor: Date,
  dir: -1 | 1
): Date {
  if (view === "month") return addMonths(anchor, dir);
  return addDays(anchor, dir * (view === "week" ? 7 : 21));
}
