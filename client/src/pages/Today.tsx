import AppShell from "@/components/AppShell";
import { useNewTask } from "@/components/NewTaskDialog";
import StatusBadge from "@/components/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import { api, ApiError } from "@/lib/api";
import { announceDataChanged } from "@/lib/dataEvents";
import { fmtDay } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { shortCaption, toDate } from "@shared/dashboard";
import { ymd } from "@shared/dates";
import { deadlineStatus, relativeDueLabel } from "@shared/status";
import {
  autoPlan,
  DAY_END,
  DAY_END_LABEL,
  DAY_START_LABEL,
  DAY_START,
  fitBlock,
  layoutBlocks,
  SLOT_MINUTES,
  SLOTS,
  sortTodo,
  TODO_GROUP_LABELS,
  todoGroup,
  toLabel,
  toMinutes,
  type TodoGroup,
} from "@shared/today";
import type { Case, Task } from "@shared/types";
import { format, startOfDay } from "date-fns";
import {
  Clock,
  GripVertical,
  ListOrdered,
  Minus,
  Plus,
  Undo2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const ROW_PX = 36; // one 30-minute slot
const DRAG_TYPE = "text/mbmt-task";
/** Set only when dragging a block that is already on the planner. */
const BLOCK_TYPE = "text/mbmt-block";
const LENGTHS = [30, 60, 90, 120, 180, 240];
const lengthLabel = (m: number) =>
  m < 60 ? `${m} min` : `${m / 60} hour${m === 60 ? "" : "s"}`;

async function patchTask(id: number, body: Partial<Task>) {
  await api(`/tasks/${id}`, { method: "PATCH", body });
  announceDataChanged();
}

function useNowMinutes() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now.getHours() * 60 + now.getMinutes();
}

/** Keyboard/screen-reader alternative to drag and drop. */
function ScheduleDialog({
  task,
  todayYmd,
  onClose,
}: {
  task: Task | null;
  todayYmd: string;
  onClose: () => void;
}) {
  const [start, setStart] = useState("09:00");
  const [length, setLength] = useState("60");
  useEffect(() => {
    if (!task) return;
    const scheduledToday =
      task.scheduledDate === todayYmd &&
      task.scheduledStart &&
      task.scheduledEnd;
    setStart(scheduledToday ? task.scheduledStart! : "09:00");
    setLength(
      scheduledToday
        ? String(
            toMinutes(task.scheduledEnd!) - toMinutes(task.scheduledStart!)
          )
        : "60"
    );
  }, [task, todayYmd]);
  if (!task) return null;
  const scheduledToday = task.scheduledDate === todayYmd && task.scheduledStart;

  const save = async () => {
    const block = fitBlock(start, Number(length));
    try {
      await patchTask(task.id, {
        scheduledDate: todayYmd,
        scheduledStart: block.start,
        scheduledEnd: block.end,
      });
      toast("Planned", {
        description: `${task.title} · ${toLabel(block.start)}–${toLabel(block.end)}`,
      });
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not plan the task."
      );
    }
  };
  const remove = async () => {
    await patchTask(task.id, {
      scheduledDate: null,
      scheduledStart: null,
      scheduledEnd: null,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md p-8 gap-5 bg-plaster">
        <div className="eyebrow">Plan into today</div>
        <DialogTitle className="display text-3xl text-ink font-extralight">
          {task.title}
        </DialogTitle>
        <DialogDescription className="text-sm text-smoke">
          Or drag the task onto the day planner.
        </DialogDescription>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label htmlFor="sch-start" className="eyebrow">
              Start
            </label>
            <Select value={start} onValueChange={setStart}>
              <SelectTrigger id="sch-start" className="w-full mt-2 bg-plaster">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {SLOTS.map(s => (
                  <SelectItem key={s} value={s}>
                    {toLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="sch-length" className="eyebrow">
              Length
            </label>
            <Select value={length} onValueChange={setLength}>
              <SelectTrigger id="sch-length" className="w-full mt-2 bg-plaster">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LENGTHS.map(l => (
                  <SelectItem key={l} value={String(l)}>
                    {lengthLabel(l)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" className="btn-solid" onClick={save}>
            Plan it
          </button>
          {scheduledToday && (
            <button type="button" className="btn-line" onClick={remove}>
              Remove from today
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TodoItem({
  task,
  parent,
  kase,
  today,
  todayYmd,
  onPlan,
}: {
  task: Task;
  parent?: Task;
  kase?: Case;
  today: Date;
  todayYmd: string;
  onPlan: (t: Task) => void;
}) {
  const due = task.dueDate ? toDate(task.dueDate) : null;
  const status = due ? deadlineStatus(due, today) : null;
  const planned =
    task.scheduledDate === todayYmd && task.scheduledStart && task.scheduledEnd;

  const complete = async () => {
    await patchTask(task.id, { status: "done" });
    toast("Done", {
      description: task.title,
      action: {
        label: "Undo",
        onClick: () => patchTask(task.id, { status: "open" }),
      },
    });
  };

  return (
    <li
      draggable
      onDragStart={e => {
        e.dataTransfer.setData(DRAG_TYPE, String(task.id));
        e.dataTransfer.effectAllowed = "move";
      }}
      data-task-id={task.id}
      className={cn(
        "data-row group flex items-start gap-3 py-3 pl-3 pr-2 cursor-grab active:cursor-grabbing transition-colors duration-300",
        status && `status-${status}`
      )}
    >
      <GripVertical
        className="size-4 mt-0.5 shrink-0 text-sand group-hover:text-ash"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <Checkbox
        id={`done-${task.id}`}
        className="mt-0.5"
        aria-label={`Mark "${task.title}" done`}
        onCheckedChange={v => v === true && complete()}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-ink">
          {parent && <span className="text-ash">{parent.title} › </span>}
          {task.title}
        </div>
        <p className="text-xs text-ash mt-0.5">
          {kase && (
            <Link href={`/cases/${kase.id}`} className="link-quiet">
              {shortCaption(kase.caption)}
            </Link>
          )}
          {` · P${task.priority}`}
          {due &&
            ` · ${fmtDay(task.dueDate!)} (${relativeDueLabel(due, today)})`}
        </p>
        {planned && (
          <p className="text-xs text-ink mt-0.5 flex items-center gap-1">
            <Clock className="size-3" strokeWidth={1.5} aria-hidden="true" />
            Planned {toLabel(task.scheduledStart!)}–
            {toLabel(task.scheduledEnd!)}
          </p>
        )}
      </div>
      {status && status !== "ok" && <StatusBadge status={status} />}
      <button
        type="button"
        onClick={() => onPlan(task)}
        className="p-1 text-ash hover:text-ink"
        aria-label={`Plan "${task.title}" into today`}
        title="Plan into today"
      >
        <Clock className="size-4" strokeWidth={1.5} />
      </button>
    </li>
  );
}

function Planner({
  tasks,
  caseById,
  todayYmd,
  onPlan,
}: {
  tasks: Task[];
  caseById: Map<number, Case>;
  todayYmd: string;
  onPlan: (t: Task) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const nowMin = useNowMinutes();
  const scheduled = tasks.filter(
    t => t.scheduledDate === todayYmd && t.scheduledStart && t.scheduledEnd
  );
  const blocks = layoutBlocks(scheduled);
  const plannedMinutes = scheduled.reduce(
    (n, t) => n + toMinutes(t.scheduledEnd!) - toMinutes(t.scheduledStart!),
    0
  );

  const drop = async (slot: string, e: React.DragEvent) => {
    e.preventDefault();
    setHover(null);
    const id = Number(e.dataTransfer.getData(DRAG_TYPE));
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const keep =
      t.scheduledDate === todayYmd && t.scheduledStart && t.scheduledEnd
        ? toMinutes(t.scheduledEnd) - toMinutes(t.scheduledStart)
        : 60;
    const block = fitBlock(slot, keep);
    await patchTask(t.id, {
      scheduledDate: todayYmd,
      scheduledStart: block.start,
      scheduledEnd: block.end,
    });
  };

  const resize = (t: Task, by: number) => {
    const len = toMinutes(t.scheduledEnd!) - toMinutes(t.scheduledStart!) + by;
    if (len < SLOT_MINUTES) return;
    const block = fitBlock(t.scheduledStart!, len);
    patchTask(t.id, { scheduledStart: block.start, scheduledEnd: block.end });
  };

  return (
    <section aria-labelledby="planner-title">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="eyebrow mb-2">
            Day planner · {DAY_START_LABEL} – {DAY_END_LABEL}
          </div>
          <h2 id="planner-title" className="display text-3xl text-ink">
            {plannedMinutes
              ? `${lengthLabel(plannedMinutes)} planned`
              : "Nothing planned yet"}
          </h2>
        </div>
        <p className="text-xs text-ash max-w-48 text-right">
          Drag a task onto a time. Drag a block back to the list to unplan it.
        </p>
      </div>

      <div
        className="relative border-t border-sand"
        style={{ height: SLOTS.length * ROW_PX }}
      >
        {/* Slots (drop targets) */}
        {SLOTS.map((s, i) => (
          <div
            key={s}
            data-slot={s}
            onDragOver={e => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setHover(s);
            }}
            onDragLeave={() => setHover(h => (h === s ? null : h))}
            onDrop={e => drop(s, e)}
            className={cn(
              "absolute inset-x-0 flex border-b transition-colors duration-200",
              s.endsWith(":00")
                ? "border-sand"
                : "border-sand/50 border-dashed",
              hover === s && "bg-sand/60"
            )}
            style={{ top: i * ROW_PX, height: ROW_PX }}
          >
            <span className="w-16 shrink-0 pr-3 pt-1 text-right text-[0.68rem] text-ash tabular-nums">
              {s.endsWith(":00") ? toLabel(s) : ""}
            </span>
          </div>
        ))}

        {/* Now line */}
        {nowMin >= DAY_START && nowMin <= DAY_END && (
          <div
            aria-hidden="true"
            className="absolute left-16 right-0 border-t border-roof z-20 pointer-events-none"
            style={{ top: ((nowMin - DAY_START) / SLOT_MINUTES) * ROW_PX }}
          >
            <span className="absolute -top-2.5 -left-11 text-[0.6rem] uppercase tracking-[0.14em] text-roof bg-plaster px-1">
              now
            </span>
          </div>
        )}

        {/* Blocks */}
        <div className="absolute top-0 bottom-0 left-16 right-0 pointer-events-none">
          {blocks.map(b => {
            const t = b.task;
            const kase = caseById.get(t.caseId);
            const height = ((b.end - b.start) / SLOT_MINUTES) * ROW_PX;
            const short = b.end - b.start <= SLOT_MINUTES;
            return (
              <div
                key={t.id}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData(DRAG_TYPE, String(t.id));
                  e.dataTransfer.setData(BLOCK_TYPE, String(t.id));
                  e.dataTransfer.effectAllowed = "move";
                }}
                data-block-id={t.id}
                className={cn(
                  "absolute pointer-events-auto bg-limestone border-l-[3px] border-navy px-2.5 overflow-hidden cursor-grab group z-10",
                  short ? "py-1" : "py-1.5",
                  t.status === "done" && "opacity-60"
                )}
                style={{
                  top: ((b.start - DAY_START) / SLOT_MINUTES) * ROW_PX + 1,
                  height: height - 2,
                  left: `calc(${(b.lane / b.lanes) * 100}% + 2px)`,
                  width: `calc(${100 / b.lanes}% - 4px)`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* 30-minute blocks only fit one line: title + time side by side */}
                  <div
                    className={cn(
                      "min-w-0",
                      short && "flex items-baseline gap-2"
                    )}
                  >
                    <div
                      className={cn(
                        "text-sm text-ink truncate",
                        t.status === "done" && "line-through"
                      )}
                    >
                      {t.title}
                    </div>
                    <div className="text-[0.68rem] text-smoke truncate shrink-0">
                      {toLabel(t.scheduledStart!)}–{toLabel(t.scheduledEnd!)}
                      {kase && !short ? ` · ${shortCaption(kase.caption)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center shrink-0 opacity-60 group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      className="p-0.5 text-smoke hover:text-ink"
                      onClick={() => resize(t, -SLOT_MINUTES)}
                      aria-label={`Shorten "${t.title}" by 30 minutes`}
                    >
                      <Minus className="size-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      className="p-0.5 text-smoke hover:text-ink"
                      onClick={() => resize(t, SLOT_MINUTES)}
                      aria-label={`Lengthen "${t.title}" by 30 minutes`}
                    >
                      <Plus className="size-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      className="p-0.5 text-smoke hover:text-ink"
                      onClick={() => onPlan(t)}
                      aria-label={`Change time for "${t.title}"`}
                    >
                      <Clock className="size-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      className="p-0.5 text-smoke hover:text-roof"
                      onClick={() =>
                        patchTask(t.id, {
                          scheduledDate: null,
                          scheduledStart: null,
                          scheduledEnd: null,
                        })
                      }
                      aria-label={`Remove "${t.title}" from today`}
                    >
                      <X className="size-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function Today() {
  const { user } = useSession();
  const { openNewTask } = useNewTask();
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayYmd = ymd(today);
  const [planning, setPlanning] = useState<Task | null>(null);

  const mine = useApi<Task[]>(user ? `/tasks?assignedTo=${user.id}` : null);
  const cases = useApi<Case[]>("/cases");
  const caseById = useMemo(
    () => new Map((cases.data ?? []).map(c => [c.id, c])),
    [cases.data]
  );
  const taskById = useMemo(
    () => new Map((mine.data ?? []).map(t => [t.id, t])),
    [mine.data]
  );

  const todo = useMemo(
    () => sortTodo(mine.data ?? [], today),
    [mine.data, today]
  );
  const groups = (["overdue", "today", "upcoming", "undated"] as TodoGroup[])
    .map(g => ({ g, rows: todo.filter(t => todoGroup(t, today) === g) }))
    .filter(x => x.rows.length);
  const [dropBack, setDropBack] = useState(false);

  /** A planned block dropped back on the list comes off today's plan. */
  const unplanFromDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropBack(false);
    const id = Number(e.dataTransfer.getData(BLOCK_TYPE));
    const t = taskById.get(id);
    if (!t) return;
    const was = {
      scheduledDate: t.scheduledDate,
      scheduledStart: t.scheduledStart,
      scheduledEnd: t.scheduledEnd,
    };
    await patchTask(id, {
      scheduledDate: null,
      scheduledStart: null,
      scheduledEnd: null,
    });
    toast("Taken off today's plan", {
      description: t.title,
      action: { label: "Undo", onClick: () => patchTask(id, was) },
    });
  };

  /** "Plan my day for me": fill the rest of today in priority order. */
  const planMyDay = async () => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const plan = autoPlan(mine.data ?? [], today, todayYmd, nowMin);
    if (plan.length === 0) {
      toast("Nothing to plan", {
        description:
          nowMin >= DAY_END
            ? `The workday is over (${DAY_END_LABEL}). Try again tomorrow morning.`
            : "Every open task is already planned, or there's no free time left today.",
      });
      return;
    }
    try {
      await Promise.all(
        plan.map(p =>
          api(`/tasks/${p.taskId}`, {
            method: "PATCH",
            body: {
              scheduledDate: todayYmd,
              scheduledStart: p.start,
              scheduledEnd: p.end,
            },
          })
        )
      );
    } finally {
      announceDataChanged();
    }
    const first = taskById.get(plan[0].taskId);
    toast(
      `Planned ${plan.length} task${plan.length === 1 ? "" : "s"} in priority order`,
      {
        description: first
          ? `Start with: ${first.title} at ${toLabel(plan[0].start)}`
          : undefined,
        action: {
          label: "Undo",
          onClick: async () => {
            await Promise.all(
              plan.map(p =>
                api(`/tasks/${p.taskId}`, {
                  method: "PATCH",
                  body: {
                    scheduledDate: null,
                    scheduledStart: null,
                    scheduledEnd: null,
                  },
                })
              )
            );
            announceDataChanged();
          },
        },
      }
    );
  };

  const overdue = groups.find(x => x.g === "overdue")?.rows.length ?? 0;
  const dueToday = groups.find(x => x.g === "today")?.rows.length ?? 0;

  return (
    <AppShell title="Today">
      <div className="max-w-[1180px] animate-fade-in-up">
        <div className="flex items-end justify-between gap-6 mb-12">
          <div>
            <div className="eyebrow mb-3">
              Today · {format(today, "EEEE, MMMM d")}
            </div>
            <h1 className="display text-5xl text-ink">Plan your day.</h1>
            {mine.data && (
              <p className="font-serif italic text-2xl text-smoke mt-3">
                {overdue} overdue · {dueToday} due today · {todo.length} open in
                all
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              className="btn-line"
              onClick={planMyDay}
              disabled={!mine.data}
              title="Fills the rest of today, one hour per task: overdue first, then due today, then P1 → P3"
            >
              <ListOrdered
                className="size-3.5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Plan my day for me
            </button>
            <button
              type="button"
              className="btn-solid"
              onClick={() => openNewTask()}
            >
              <Plus className="size-3.5" strokeWidth={1.5} aria-hidden="true" />{" "}
              New task
            </button>
          </div>
        </div>

        {mine.error ? (
          <p role="alert" className="text-sm text-roof">
            Couldn't load your tasks: {mine.error.message}
          </p>
        ) : !mine.data ? (
          <p className="text-sm text-ash">Loading your day…</p>
        ) : (
          <div className="grid grid-cols-2 gap-12 items-start">
            <section
              aria-labelledby="todo-title"
              className={cn(
                "relative transition-colors duration-200",
                dropBack &&
                  "outline-2 outline-dashed outline-offset-8 outline-ash bg-sand/40"
              )}
              onDragOver={e => {
                if (!e.dataTransfer.types.includes(BLOCK_TYPE)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDropBack(true);
              }}
              onDragLeave={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                  setDropBack(false);
              }}
              onDrop={unplanFromDrop}
            >
              {dropBack && (
                <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 bg-navy text-plaster text-xs tracking-[0.18em] uppercase py-2 pointer-events-none">
                  <Undo2
                    className="size-3.5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  Drop to take it off today's plan
                </div>
              )}
              <div className="eyebrow mb-2">To-do · {user?.name}</div>
              <h2 id="todo-title" className="display text-3xl text-ink mb-4">
                {todo.length ? "In order" : "All clear"}
              </h2>
              {todo.length === 0 ? (
                <p className="font-serif italic text-xl text-smoke">
                  Nothing open. A rare quiet day.
                </p>
              ) : (
                <div className="space-y-6">
                  {groups.map(({ g, rows }) => (
                    <div key={g}>
                      <h3
                        className={cn(
                          "eyebrow mb-1",
                          g === "overdue" && "text-roof"
                        )}
                      >
                        {TODO_GROUP_LABELS[g]} ({rows.length})
                      </h3>
                      <ul className="border-t border-sand">
                        {rows.map(t => (
                          <TodoItem
                            key={t.id}
                            task={t}
                            parent={
                              t.parentTaskId
                                ? taskById.get(t.parentTaskId)
                                : undefined
                            }
                            kase={caseById.get(t.caseId)}
                            today={today}
                            todayYmd={todayYmd}
                            onPlan={setPlanning}
                          />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <div>
              <Planner
                tasks={mine.data}
                caseById={caseById}
                todayYmd={todayYmd}
                onPlan={setPlanning}
              />
            </div>
          </div>
        )}
      </div>
      <ScheduleDialog
        task={planning}
        todayYmd={todayYmd}
        onClose={() => setPlanning(null)}
      />
    </AppShell>
  );
}
