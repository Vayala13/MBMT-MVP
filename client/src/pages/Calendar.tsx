import AppShell from "@/components/AppShell";
import { ErrorState, LoadingState } from "@/components/States";
import ItemDrawer from "@/components/dashboard/ItemDrawer";
import type { DrawerItem } from "@/components/dashboard/types";
import { STATUS_ICONS } from "@/components/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import { useMyWork } from "@/lib/myWork";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  CALENDAR_VIEWS,
  calendarDays,
  shiftAnchor,
  type CalendarView,
} from "@shared/calendar";
import { shortCaption, toDate } from "@shared/dashboard";
import { ymd } from "@shared/dates";
import { ROLE_LABELS } from "@shared/enums";
import { deadlineStatus, STATUS_LABELS } from "@shared/status";
import { toLabel } from "@shared/today";
import type { Case, Deadline, Task, User } from "@shared/types";
import { format, getDay, startOfDay } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ListTodo,
  UserCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

const EVERYONE = "all";
const MONTH_LIMIT = 3; // chips per day before "+N more" in month view

type Item =
  | { key: string; kind: "deadline"; d: Deadline }
  | { key: string; kind: "due"; t: Task }
  | { key: string; kind: "block"; t: Task };

export default function Calendar() {
  const { user } = useSession();
  const { myWork } = useMyWork();
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayYmd = ymd(today);
  const [view, setView] = useState<CalendarView>("3weeks");
  const [anchor, setAnchor] = useState(today);
  const [person, setPerson] = useState(EVERYONE);
  const [show, setShow] = useState({
    deadlines: true,
    due: true,
    blocks: true,
  });
  const [drawer, setDrawer] = useState<DrawerItem | null>(null);

  const deadlines = useApi<Deadline[]>("/deadlines");
  const tasks = useApi<Task[]>("/tasks");
  const cases = useApi<Case[]>("/cases");
  const users = useApi<User[]>("/users");
  const loadError =
    deadlines.error ?? tasks.error ?? cases.error ?? users.error;
  const caseById = useMemo(
    () => new Map((cases.data ?? []).map(c => [c.id, c])),
    [cases.data]
  );
  const userById = useMemo(
    () => new Map((users.data ?? []).map(u => [u.id, u])),
    [users.data]
  );

  // "My work" overrides the person filter.
  const who = myWork && user ? String(user.id) : person;
  const forWho = (assignedTo: number | null) =>
    who === EVERYONE || String(assignedTo) === who;

  const days = calendarDays(view, anchor);
  const first = days[0].date;
  const last = days[days.length - 1].date;

  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    const add = (date: string, it: Item) => {
      if (date < first || date > last) return;
      map.set(date, [...(map.get(date) ?? []), it]);
    };
    if (show.deadlines)
      for (const d of deadlines.data ?? [])
        if (forWho(d.assignedTo))
          add(d.dueDate, { key: `d${d.id}`, kind: "deadline", d });
    for (const t of tasks.data ?? []) {
      if (!forWho(t.assignedTo)) continue;
      if (show.due && t.status === "open" && t.dueDate)
        add(t.dueDate, { key: `t${t.id}`, kind: "due", t });
      if (show.blocks && t.scheduledDate && t.scheduledStart)
        add(t.scheduledDate, { key: `b${t.id}`, kind: "block", t });
    }
    // Deadlines first, then time blocks by start time, then tasks due.
    const rank = (i: Item) =>
      i.kind === "deadline" ? 0 : i.kind === "block" ? 1 : 2;
    for (const list of map.values())
      list.sort(
        (a, b) =>
          rank(a) - rank(b) ||
          (a.kind === "block" && b.kind === "block"
            ? a.t.scheduledStart!.localeCompare(b.t.scheduledStart!)
            : 0)
      );
    return map;
  }, [deadlines.data, tasks.data, show, who, first, last]);

  const title =
    view === "month"
      ? format(anchor, "MMMM yyyy")
      : `${format(toDate(first), "MMM d")} – ${format(toDate(last), "MMM d, yyyy")}`;

  const chip = (it: Item) => {
    if (it.kind === "deadline") {
      const status = it.d.doneAt
        ? null
        : deadlineStatus(toDate(it.d.dueDate), today);
      const Icon = status ? STATUS_ICONS[status] : ListTodo;
      const c = caseById.get(it.d.caseId);
      return (
        <button
          key={it.key}
          type="button"
          onClick={() =>
            setDrawer({
              kind: "deadline",
              id: it.d.id,
              caseId: it.d.caseId,
              title: it.d.title,
            })
          }
          aria-label={`Deadline${status ? `, ${STATUS_LABELS[status]}` : ", done"}: ${it.d.title}, ${c?.caption ?? ""}`}
          title={`${it.d.title} · ${c?.caption ?? ""}`}
          className={cn(
            "w-full text-left bg-limestone hover:bg-[#e8e2d7] transition-colors duration-300 pl-1.5 pr-1 py-1 text-xs leading-tight text-ink flex items-start gap-1.5",
            status
              ? `status-${status}`
              : "border-l-[3px] border-sand line-through text-ash"
          )}
        >
          <Icon
            className="size-3 shrink-0 mt-0.5 text-smoke"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="block truncate">{it.d.title}</span>
            <span className="block truncate text-[0.68rem] text-smoke">
              {c ? shortCaption(c.caption) : ""}
            </span>
          </span>
        </button>
      );
    }
    const t = it.t;
    const c = caseById.get(t.caseId);
    const block = it.kind === "block";
    return (
      <button
        key={it.key}
        type="button"
        onClick={() =>
          setDrawer({
            kind: "task",
            id: t.id,
            caseId: t.caseId,
            title: t.title,
          })
        }
        aria-label={`${block ? "Planned" : "Task due"}: ${t.title}${block ? `, ${toLabel(t.scheduledStart!)}` : ""}`}
        title={`${t.title} · ${c?.caption ?? ""}`}
        className={cn(
          "w-full text-left hover:bg-[#e8e2d7] transition-colors duration-300 pl-1.5 pr-1 py-1 text-xs leading-tight text-ink flex items-start gap-1.5",
          block
            ? "border-l-[3px] border-navy bg-plaster"
            : "border border-sand border-l-[3px] border-l-sandstone bg-plaster"
        )}
      >
        {block ? (
          <Clock
            className="size-3 shrink-0 mt-0.5 text-smoke"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        ) : (
          <ListTodo
            className="size-3 shrink-0 mt-0.5 text-smoke"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}
        <span className="min-w-0">
          <span className="block truncate">
            {block && (
              <span className="text-smoke">{toLabel(t.scheduledStart!)} </span>
            )}
            {t.title}
          </span>
          <span className="block truncate text-[0.68rem] text-smoke">
            {c ? shortCaption(c.caption) : ""}
          </span>
        </span>
      </button>
    );
  };

  return (
    <AppShell title="Calendar">
      <div className="max-w-[1180px] animate-fade-in-up">
        <div className="eyebrow mb-3">Calendar</div>
        <h1 className="display text-5xl text-ink mb-8">{title}</h1>

        {/* Controls */}
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4 mb-6">
          <div>
            <div className="eyebrow mb-2">View</div>
            <div role="radiogroup" aria-label="View" className="flex">
              {CALENDAR_VIEWS.map(v => (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={view === v.id}
                  onClick={() => setView(v.id)}
                  className={cn(
                    "border px-3.5 py-2 text-[0.68rem] tracking-[0.2em] uppercase -ml-px first:ml-0 transition-colors duration-300",
                    view === v.id
                      ? "bg-navy border-navy text-plaster relative z-10"
                      : "border-sand text-smoke hover:text-ink"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-2 border border-sand hover:border-ink"
              onClick={() => setAnchor(a => shiftAnchor(view, a, -1))}
              aria-label="Previous"
            >
              <ChevronLeft className="size-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className="px-3 py-2 border border-sand hover:border-ink text-[0.68rem] tracking-[0.2em] uppercase"
              onClick={() => setAnchor(today)}
            >
              Today
            </button>
            <button
              type="button"
              className="p-2 border border-sand hover:border-ink"
              onClick={() => setAnchor(a => shiftAnchor(view, a, 1))}
              aria-label="Next"
            >
              <ChevronRight className="size-4" strokeWidth={1.5} />
            </button>
          </div>
          <div>
            <label htmlFor="cal-person" className="eyebrow">
              Person
            </label>
            <Select value={who} onValueChange={setPerson} disabled={myWork}>
              <SelectTrigger id="cal-person" className="w-60 mt-2 bg-plaster">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EVERYONE}>Everyone</SelectItem>
                {(users.data ?? []).map(u => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name} · {ROLE_LABELS[u.role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <fieldset className="flex items-center gap-5 h-9">
            <legend className="sr-only">Show</legend>
            {(
              [
                ["deadlines", "Deadlines"],
                ["due", "Tasks due"],
                ["blocks", "Planned time"],
              ] as const
            ).map(([k, label]) => (
              <div key={k} className="flex items-center gap-2">
                <Checkbox
                  id={`cal-${k}`}
                  checked={show[k]}
                  onCheckedChange={v =>
                    setShow(s => ({ ...s, [k]: v === true }))
                  }
                />
                <label htmlFor={`cal-${k}`} className="text-sm text-ink">
                  {label}
                </label>
              </div>
            ))}
          </fieldset>
        </div>
        {myWork && (
          <p className="text-sm text-smoke mb-4 flex items-center gap-2">
            <UserCheck
              className="size-4"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            My work is on: showing only your items.
          </p>
        )}

        {loadError ? (
          <ErrorState what="the calendar" error={loadError} />
        ) : !deadlines.data || !tasks.data || !cases.data ? (
          <LoadingState what="the calendar" />
        ) : (
          <>
            {/* Grid */}
            <div className="border-t border-l border-sand">
              <div className="grid grid-cols-7">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <div
                    key={d}
                    className="eyebrow px-2 py-2 border-r border-b border-sand"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <ol className="grid grid-cols-7">
                {days.map(({ date, inRange }) => {
                  const items = byDay.get(date) ?? [];
                  const d = toDate(date);
                  const weekend = getDay(d) === 0 || getDay(d) === 6;
                  const isToday = date === todayYmd;
                  const limit = view === "month" ? MONTH_LIMIT : Infinity;
                  return (
                    <li
                      key={date}
                      data-date={date}
                      aria-label={`${format(d, "EEEE, MMMM d")}: ${items.length} item${items.length === 1 ? "" : "s"}`}
                      className={cn(
                        "border-r border-b border-sand p-1.5 flex flex-col gap-1",
                        view === "month"
                          ? "min-h-28"
                          : view === "week"
                            ? "min-h-80"
                            : "min-h-36",
                        weekend && "bg-sand/35",
                        !inRange && "opacity-45"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-baseline gap-1.5 px-0.5 mb-0.5",
                          isToday && "text-ink"
                        )}
                      >
                        <span
                          className={cn(
                            "text-sm tabular-nums",
                            isToday
                              ? "bg-navy text-plaster px-1.5"
                              : "text-smoke"
                          )}
                        >
                          {format(d, "d")}
                        </span>
                        {(format(d, "d") === "1" || date === first) && (
                          <span className="text-[0.65rem] uppercase tracking-[0.14em] text-ash">
                            {format(d, "MMM")}
                          </span>
                        )}
                        {isToday && (
                          <span className="text-[0.65rem] uppercase tracking-[0.14em] text-ink">
                            Today
                          </span>
                        )}
                      </div>
                      {items.slice(0, limit).map(chip)}
                      {items.length > limit && (
                        <button
                          type="button"
                          className="link-quiet text-xs text-ink text-left px-1 w-fit"
                          onClick={() => {
                            setView("week");
                            setAnchor(d);
                          }}
                        >
                          +{items.length - limit} more
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </>
        )}

        <p className="text-xs text-ash mt-4 flex flex-wrap gap-x-5 gap-y-1">
          <span>Deadlines: colored edge + status icon</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3" strokeWidth={1.5} aria-hidden="true" />{" "}
            Planned time (navy edge)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ListTodo className="size-3" strokeWidth={1.5} aria-hidden="true" />{" "}
            Task due
          </span>
          <span>
            Click anything to open it, reassign it or change its date.
          </span>
        </p>
      </div>

      <ItemDrawer
        item={drawer}
        today={today}
        caseById={caseById}
        userById={userById}
        onClose={() => setDrawer(null)}
        onChanged={() => {}}
      />
    </AppShell>
  );
}
