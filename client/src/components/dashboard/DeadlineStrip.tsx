import StatusBadge, { STATUS_ICONS } from "@/components/StatusBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fmtDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { shortCaption, toDate, type StripDay } from "@shared/dashboard";
import { relativeDueLabel, STATUS_LABELS } from "@shared/status";
import type { Case } from "@shared/types";
import { format } from "date-fns";
import type { DrawerItem } from "./types";

/** Weekends are narrower so the 15 working days get the room. */
const colWidth = (d: StripDay) =>
  d.weekend ? "minmax(0,0.4fr)" : "minmax(0,1fr)";

export default function DeadlineStrip({
  days,
  today,
  caseById,
  onOpen,
}: {
  days: StripDay[];
  today: Date;
  caseById: Map<number, Case>;
  onOpen: (item: DrawerItem) => void;
}) {
  const template = days.map(colWidth).join(" ");
  const weeks = [1, 2, 3].map(w => days.filter(d => d.week === w));

  return (
    <section aria-labelledby="strip-title">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="eyebrow mb-2">Next 3 weeks</div>
          <h2 id="strip-title" className="display text-3xl text-ink">
            Deadline strip
          </h2>
        </div>
        <div className="flex items-center gap-2" aria-label="Legend">
          <StatusBadge status="soon" label="≤ 7 days" />
          <StatusBadge status="ok" label="On track" />
          <span className="text-xs text-ash ml-1">Weekends shaded</span>
        </div>
      </div>

      <div className="border border-sand bg-plaster">
        {/* Week labels */}
        <div
          className="grid border-b border-sand"
          style={{ gridTemplateColumns: template }}
        >
          {weeks.map((w, i) => (
            <div
              key={i}
              className={cn(
                "px-2 py-2 eyebrow",
                i > 0 && "border-l border-ash/40"
              )}
              style={{ gridColumn: `span ${w.length}` }}
            >
              Week {i + 1}{" "}
              <span className="normal-case tracking-normal text-ash">
                · {format(toDate(w[0].date), "MMM d")} –{" "}
                {format(toDate(w[w.length - 1].date), "MMM d")}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        <ol className="grid" style={{ gridTemplateColumns: template }}>
          {days.map(d => {
            const date = toDate(d.date);
            const isToday = d.offset === 0;
            return (
              <li
                key={d.date}
                aria-label={`${fmtDay(d.date)}: ${d.deadlines.length} deadline${d.deadlines.length === 1 ? "" : "s"}`}
                className={cn(
                  "min-h-40 flex flex-col",
                  d.weekend && "bg-sand/45",
                  d.offset > 0 &&
                    (d.offset % 7 === 0
                      ? "border-l border-ash/40"
                      : "border-l border-sand")
                )}
              >
                <div
                  className={cn(
                    "text-center py-1.5 border-b",
                    isToday ? "border-navy border-b-2" : "border-sand"
                  )}
                >
                  <div className="text-[0.6rem] uppercase tracking-[0.14em] text-ash">
                    {isToday
                      ? "Today"
                      : format(date, d.weekend ? "EEEEE" : "EEE")}
                  </div>
                  <div
                    className={cn(
                      "text-sm tabular-nums",
                      isToday ? "text-ink font-normal" : "text-smoke"
                    )}
                  >
                    {format(date, "d")}
                  </div>
                </div>
                <div className="flex flex-col gap-1 p-0.5">
                  {d.deadlines.map(({ deadline, status }) => {
                    const Icon = STATUS_ICONS[status];
                    const c = caseById.get(deadline.caseId);
                    const when = relativeDueLabel(date, today);
                    return (
                      <Tooltip key={deadline.id}>
                        <TooltipTrigger asChild>
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
                            aria-label={`${STATUS_LABELS[status]}: ${deadline.title}, ${c?.caption ?? ""}, due ${fmtDay(d.date)}`}
                            className={cn(
                              `status-${status}`,
                              "w-full text-left bg-limestone hover:bg-[#e8e2d7] transition-colors duration-300 pl-1 pr-0.5 py-1 text-[0.625rem] leading-[1.15] text-ink flex flex-col gap-0.5"
                            )}
                          >
                            <Icon
                              className="size-3 shrink-0 text-smoke"
                              strokeWidth={1.75}
                              aria-hidden="true"
                            />
                            {/* Narrow columns: let long names break across two lines instead of "Q…" */}
                            <span className="break-all line-clamp-2">
                              {c ? shortCaption(c.caption) : "Case"}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-64">
                          <div className="font-normal">{deadline.title}</div>
                          <div className="opacity-80">{c?.caption}</div>
                          <div className="opacity-80">
                            {fmtDay(d.date)} · {when} · {STATUS_LABELS[status]}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
