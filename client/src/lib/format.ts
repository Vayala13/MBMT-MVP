import { toDate } from "@shared/dashboard";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

/** "2026-10-19" → "Mon, Oct 19" */
export const fmtDay = (ymd: string) => format(toDate(ymd), "EEE, MMM d");
/** "2026-05-02" → "May 2, 2026" */
export const fmtDayYear = (ymd: string) => format(toDate(ymd), "MMM d, yyyy");
/** "2026-10-19" → "10/19" */
export const fmtShort = (ymd: string) => format(toDate(ymd), "M/d");
/** ISO timestamp → "Jul 26, 2025" */
export const fmtDate = (iso: string) => format(parseISO(iso), "MMM d, yyyy");
/** ISO timestamp → "just now" / "3 days ago" */
export const timeAgo = (iso: string) =>
  Date.now() - parseISO(iso).getTime() < 60_000
    ? "just now"
    : `${formatDistanceToNowStrict(parseISO(iso))} ago`;
