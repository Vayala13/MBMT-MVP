import StatusBadge from "@/components/StatusBadge";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toDate, type CountdownRow } from "@shared/dashboard";
import { relativeDueLabel } from "@shared/status";
import type { Case, User } from "@shared/types";
import { format } from "date-fns";
import type { DrawerItem } from "./types";

export default function CountdownList({
  rows,
  today,
  caseById,
  userById,
  onOpen,
}: {
  rows: CountdownRow[];
  today: Date;
  caseById: Map<number, Case>;
  userById: Map<number, User>;
  onOpen: (item: DrawerItem) => void;
}) {
  return (
    <section aria-labelledby="countdown-title">
      <div className="eyebrow mb-2">Countdown</div>
      <h2 id="countdown-title" className="display text-3xl text-ink mb-5">
        Next 3 weeks
      </h2>
      {rows.length === 0 ? (
        <p className="font-serif italic text-xl text-smoke">
          Nothing due in the next 3 weeks. A quiet stretch.
        </p>
      ) : (
        <ol className="border-t border-sand">
          {rows.map(({ deadline, status }) => {
            const c = caseById.get(deadline.caseId);
            const toucher = c?.lastTouchedBy
              ? userById.get(c.lastTouchedBy)
              : undefined;
            const due = toDate(deadline.dueDate);
            return (
              <li key={deadline.id}>
                <button
                  type="button"
                  onClick={() =>
                    onOpen({
                      kind: "deadline",
                      id: deadline.id,
                      caseId: deadline.caseId,
                      title: deadline.title,
                    })
                  }
                  className={cn(
                    "data-row w-full text-left grid grid-cols-[3.25rem_1fr_auto] gap-4 items-center pl-4 pr-3 py-3 transition-colors duration-300",
                    `status-${status}`
                  )}
                >
                  <div className="text-center leading-none">
                    <div className="text-[0.6rem] uppercase tracking-[0.18em] text-ash">
                      {format(due, "MMM")}
                    </div>
                    <div className="display text-3xl text-ink tabular-nums mt-1">
                      {format(due, "d")}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-ink truncate">
                      {deadline.title}
                    </div>
                    <div className="text-xs text-ash truncate mt-0.5">
                      {c?.caption}
                    </div>
                    {c && (
                      <div className="text-xs text-ash truncate mt-0.5">
                        Last touched by {toucher?.name ?? "unknown"} ·{" "}
                        {timeAgo(c.lastTouchedAt)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge status={status} />
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        status === "overdue" ? "text-roof" : "text-smoke"
                      )}
                    >
                      {relativeDueLabel(due, today)}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
