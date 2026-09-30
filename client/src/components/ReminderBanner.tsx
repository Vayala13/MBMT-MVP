import { useApi } from "@/hooks/useApi";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { toDate } from "@shared/dashboard";
import { SOON_WINDOW_DAYS, daysUntil } from "@shared/status";
import type { Deadline } from "@shared/types";
import { startOfDay } from "date-fns";
import { BellRing, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const KEY = (userId: number) => `mbmt.reminderDismissed.${userId}`;

/**
 * In-app reminder on load (no email or push in the MVP):
 * "You have N deadlines in the next 7 days, M overdue." Dismissed per session.
 */
export default function ReminderBanner() {
  const { user } = useSession();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return user ? sessionStorage.getItem(KEY(user.id)) === "yes" : true;
    } catch {
      return false;
    }
  });
  const { data } = useApi<Deadline[]>(
    user && !dismissed ? "/deadlines?open=true" : null
  );
  if (!user || dismissed || !data) return null;

  const today = startOfDay(new Date());
  const mine = data.filter(d => d.assignedTo === user.id);
  const days = mine.map(d => daysUntil(toDate(d.dueDate), today));
  const soon = days.filter(n => n >= 0 && n <= SOON_WINDOW_DAYS).length;
  const overdue = days.filter(n => n < 0).length;
  if (soon + overdue === 0) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(KEY(user.id), "yes");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className={cn(
        "stone-card flex items-center gap-4 px-5 py-3 mb-10 animate-fade-in-up",
        overdue ? "status-overdue" : "status-soon"
      )}
    >
      <BellRing
        className={cn(
          "size-4 shrink-0",
          overdue ? "text-roof" : "text-[#7c5f1c]"
        )}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <p className="text-sm text-ink flex-1">
        You have{" "}
        <strong className="font-normal">
          {soon} deadline{soon === 1 ? "" : "s"}
        </strong>{" "}
        in the next {SOON_WINDOW_DAYS} days,{" "}
        <strong className={cn("font-normal", overdue && "text-roof")}>
          {overdue} overdue
        </strong>
        .
      </p>
      <Link href="/calendar" className="link-quiet text-sm text-ink">
        See calendar
      </Link>
      <button
        type="button"
        onClick={dismiss}
        className="p-1 text-ash hover:text-ink"
        aria-label="Dismiss reminder"
      >
        <X className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
