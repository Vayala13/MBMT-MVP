import { toDate } from "@shared/dashboard";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

/** "2026-10-19" → "Mon, Oct 19" */
export const fmtDay = (ymd: string) => format(toDate(ymd), "EEE, MMM d");
/** "2026-10-19" → "10/19" */
export const fmtShort = (ymd: string) => format(toDate(ymd), "M/d");
/** ISO timestamp → "Jul 26, 2025" */
export const fmtDate = (iso: string) => format(parseISO(iso), "MMM d, yyyy");
/** ISO timestamp → "3 days ago" */
export const timeAgo = (iso: string) =>
  `${formatDistanceToNowStrict(parseISO(iso))} ago`;
