import StatusBadge from "@/components/StatusBadge";
import { fmtDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PendingGroup } from "@shared/dashboard";
import type { Case, User } from "@shared/types";
import { format } from "date-fns";
import { CalendarClock, ListTodo } from "lucide-react";
import type { DrawerItem } from "./types";

export default function MonthPending({
  groups,
  today,
  caseById,
  userById,
  onOpen,
}: {
  groups: PendingGroup[];
  today: Date;
  caseById: Map<number, Case>;
  userById: Map<number, User>;
  onOpen: (item: DrawerItem) => void;
}) {
  const count = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <section aria-labelledby="month-title">
      <div className="eyebrow mb-2">
        This month pending · {format(today, "MMMM yyyy")}
      </div>
      <h2 id="month-title" className="display text-3xl text-ink mb-5">
        {count} open item{count === 1 ? "" : "s"} across {groups.length} case
        {groups.length === 1 ? "" : "s"}
      </h2>
      {groups.length === 0 ? (
        <p className="font-serif italic text-xl text-smoke">
          Nothing left open this month.
        </p>
      ) : (
        <div className="grid grid-cols-2 border-t border-l border-sand">
          {groups.map(g => {
            const c = caseById.get(g.caseId);
            return (
              <div key={g.caseId} className="p-4 border-r border-b border-sand">
                <button
                  type="button"
                  onClick={() =>
                    onOpen({
                      kind: "case",
                      id: g.caseId,
                      caseId: g.caseId,
                      title: c?.caption ?? `Case ${g.caseId}`,
                    })
                  }
                  className="link-quiet text-sm text-ink text-left"
                >
                  {c?.caption ?? `Case ${g.caseId}`}
                </button>
                <ul className="mt-2">
                  {g.items.map(it => {
                    const Icon =
                      it.kind === "deadline" ? CalendarClock : ListTodo;
                    const who = it.item.assignedTo
                      ? userById.get(it.item.assignedTo)?.name
                      : undefined;
                    return (
                      <li key={`${it.kind}-${it.item.id}`}>
                        <button
                          type="button"
                          onClick={() =>
                            onOpen({
                              kind: it.kind,
                              id: it.item.id,
                              caseId: g.caseId,
                              title: it.item.title,
                            })
                          }
                          className={cn(
                            "data-row w-full text-left flex items-center gap-3 py-2 pl-3 pr-1 transition-colors duration-300",
                            `status-${it.status}`
                          )}
                        >
                          <Icon
                            className="size-3.5 shrink-0 text-ash"
                            strokeWidth={1.5}
                            aria-label={it.kind}
                          />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm text-ink truncate">
                              {it.item.title}
                            </span>
                            <span className="block text-xs text-ash">
                              {it.kind === "deadline" ? "Deadline" : "Task"} ·{" "}
                              {fmtDay(it.dueDate)}
                              {who ? ` · ${who}` : ""}
                            </span>
                          </span>
                          <StatusBadge status={it.status} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
