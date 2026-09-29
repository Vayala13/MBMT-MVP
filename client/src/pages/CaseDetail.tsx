import AddNoteForm from "@/components/AddNoteForm";
import AppShell from "@/components/AppShell";
import DeadlineDateDialog from "@/components/DeadlineDateDialog";
import ItemDrawer from "@/components/dashboard/ItemDrawer";
import type { DrawerItem } from "@/components/dashboard/types";
import { useLogCall } from "@/components/LogCallDialog";
import { useNewTask } from "@/components/NewTaskDialog";
import StatusBadge from "@/components/StatusBadge";
import { useApi } from "@/hooks/useApi";
import { announceDataChanged } from "@/lib/dataEvents";
import { fmtDate, fmtDay, fmtDayYear, fmtShort, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toDate } from "@shared/dashboard";
import {
  CASE_STATUS_LABELS,
  DEADLINE_KIND_LABELS,
  ROLE_LABELS,
} from "@shared/enums";
import { deadlineStatus, isStale, relativeDueLabel } from "@shared/status";
import type {
  Activity,
  CallLog,
  Case,
  Deadline,
  DeadlineWithChanges,
  Note,
  Task,
  User,
} from "@shared/types";
import { parseISO, startOfDay } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Flag,
  ListTodo,
  Phone,
  Plus,
  PhoneIncoming,
  PhoneOutgoing,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

function Section({
  id,
  label,
  title,
  action,
  children,
}: {
  id: string;
  label: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="border-t border-sand pt-6">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <div className="eyebrow mb-1.5">{label}</div>
          <h2 id={id} className="display text-3xl text-ink">
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="font-serif italic text-xl text-smoke">{children}</p>
);

function DeadlineRows({
  rows,
  today,
  userById,
  onMove,
  onOpen,
}: {
  rows: DeadlineWithChanges[];
  today: Date;
  userById: Map<number, User>;
  onMove: (d: Deadline) => void;
  onOpen: (item: DrawerItem) => void;
}) {
  if (rows.length === 0) return <Empty>No deadlines on this case.</Empty>;
  return (
    <ul className="border-t border-sand">
      {rows.map(d => {
        const due = toDate(d.dueDate);
        const status = d.doneAt ? null : deadlineStatus(due, today);
        const who = d.assignedTo ? userById.get(d.assignedTo)?.name : undefined;
        return (
          <li
            key={d.id}
            className={cn(
              "data-row py-3 pr-2",
              status
                ? `status-${status} pl-4`
                : "pl-4 border-l-[3px] border-l-sand"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() =>
                    onOpen({
                      kind: "deadline",
                      id: d.id,
                      caseId: d.caseId,
                      title: d.title,
                    })
                  }
                  className={cn(
                    "text-sm text-left link-quiet",
                    d.doneAt ? "text-ash line-through" : "text-ink"
                  )}
                >
                  {d.title}
                </button>
                <div className="text-xs text-ash mt-0.5">
                  {fmtDay(d.dueDate)} · {DEADLINE_KIND_LABELS[d.kind]}
                  {who ? ` · ${who}` : ""}
                  {d.sourceNote ? ` · ${d.sourceNote}` : ""}
                </div>
                {/* Change history, inline */}
                {d.changes.map(ch => (
                  <div
                    key={ch.id}
                    className="text-xs text-smoke mt-1 flex items-center gap-1.5 flex-wrap"
                  >
                    moved from {fmtShort(ch.oldDate)}
                    <ArrowRight
                      className="size-3"
                      strokeWidth={1.5}
                      aria-label="to"
                    />
                    {fmtShort(ch.newDate)} · {ch.reason}
                    <span className="text-ash">
                      · {userById.get(ch.changedBy)?.name} on{" "}
                      {fmtDate(ch.changedAt)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {status ? (
                  <>
                    <StatusBadge status={status} />
                    <span
                      className={cn(
                        "text-xs",
                        status === "overdue" ? "text-roof" : "text-smoke"
                      )}
                    >
                      {relativeDueLabel(due, today)}
                    </span>
                    <button
                      type="button"
                      className="link-quiet text-xs text-ink"
                      onClick={() => onMove(d)}
                    >
                      Change date
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-ash flex items-center gap-1">
                    <CheckCircle2
                      className="size-3.5"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />{" "}
                    Done
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TaskRows({
  tasks,
  today,
  userById,
  onOpen,
}: {
  tasks: Task[];
  today: Date;
  userById: Map<number, User>;
  onOpen: (item: DrawerItem) => void;
}) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const top = tasks.filter(t => t.parentTaskId === null);
  const subsOf = (id: number) => tasks.filter(t => t.parentTaskId === id);
  if (top.length === 0) return <Empty>No tasks on this case.</Empty>;

  const row = (t: Task, nested = false) => {
    const status =
      t.status === "open" && t.dueDate
        ? deadlineStatus(toDate(t.dueDate), today)
        : null;
    const Icon = t.status === "done" ? CheckCircle2 : Circle;
    const who = t.assignedTo ? userById.get(t.assignedTo)?.name : undefined;
    return (
      <div
        className={cn(
          "flex items-start gap-3 flex-1 min-w-0",
          nested && "pl-7"
        )}
      >
        <Icon
          className="size-4 mt-0.5 shrink-0 text-ash"
          strokeWidth={1.5}
          aria-label={t.status}
        />
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() =>
              onOpen({
                kind: "task",
                id: t.id,
                caseId: t.caseId,
                title: t.title,
              })
            }
            className={cn(
              "text-sm text-left link-quiet",
              t.status === "done" ? "text-ash line-through" : "text-ink"
            )}
          >
            {t.title}
          </button>
          <div className="text-xs text-ash mt-0.5">
            {t.dueDate ? fmtDay(t.dueDate) : "No due date"} · P{t.priority}
            {who ? ` · ${who}` : ""}
          </div>
        </div>
        {status && <StatusBadge status={status} />}
      </div>
    );
  };

  return (
    <ul className="border-t border-sand">
      {top.map(t => {
        const subs = subsOf(t.id);
        const expanded = open.has(t.id);
        const doneSubs = subs.filter(s => s.status === "done").length;
        return (
          <li key={t.id} className="border-b border-sand py-3">
            <div className="flex items-start gap-2">
              {subs.length > 0 ? (
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={`${expanded ? "Hide" : "Show"} ${subs.length} subtasks`}
                  onClick={() =>
                    setOpen(prev => {
                      const next = new Set(prev);
                      if (next.has(t.id)) next.delete(t.id);
                      else next.add(t.id);
                      return next;
                    })
                  }
                  className="mt-0.5 text-ash hover:text-ink"
                >
                  {expanded ? (
                    <ChevronDown className="size-4" strokeWidth={1.5} />
                  ) : (
                    <ChevronRight className="size-4" strokeWidth={1.5} />
                  )}
                </button>
              ) : (
                <span className="w-4" />
              )}
              {row(t)}
            </div>
            {subs.length > 0 && (
              <div className="text-xs text-ash pl-6 mt-1">
                {doneSubs} of {subs.length} subtasks done
              </div>
            )}
            {expanded && (
              <ul className="mt-2 space-y-2.5">
                {subs.map(s => (
                  <li key={s.id} className="flex">
                    {row(s, true)}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CallRows({
  calls,
  userById,
}: {
  calls: CallLog[];
  userById: Map<number, User>;
}) {
  if (calls.length === 0) return <Empty>No calls logged yet.</Empty>;
  return (
    <ul className="border-t border-sand">
      {calls.map(c => {
        const Icon = c.direction === "in" ? PhoneIncoming : PhoneOutgoing;
        return (
          <li key={c.id} className="data-row py-3 flex items-start gap-3">
            <Icon
              className="size-4 mt-0.5 shrink-0 text-ash"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-ink">
                {c.direction === "in" ? "Call from" : "Call to"} {c.withWhom}
              </div>
              <p className="text-sm text-smoke mt-0.5">{c.summary}</p>
              {(c.keyPoints.length > 0 || c.actionItems.length > 0) && (
                <div className="grid grid-cols-2 gap-6 mt-3">
                  {c.keyPoints.length > 0 && (
                    <div>
                      <div className="eyebrow mb-1.5">Key points</div>
                      <ul className="space-y-1 text-sm text-smoke list-disc pl-4 marker:text-ash">
                        {c.keyPoints.map((k, i) => (
                          <li key={i}>{k}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {c.actionItems.length > 0 && (
                    <div>
                      <div className="eyebrow mb-1.5">Action items</div>
                      <ul className="space-y-1 text-sm text-smoke">
                        {c.actionItems.map((a, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <ListTodo
                              className="size-3.5 mt-0.5 shrink-0 text-ash"
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {c.transcript && (
                <details className="mt-3 group">
                  <summary className="link-quiet text-xs text-ink cursor-pointer w-fit list-none">
                    <span className="group-open:hidden">Show transcript</span>
                    <span className="hidden group-open:inline">
                      Hide transcript
                    </span>
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-smoke stone-card p-4">
                    {c.transcript}
                  </pre>
                </details>
              )}
              <div className="text-xs text-ash mt-2">
                {userById.get(c.userId)?.name} · {fmtDate(c.createdAt)} ·{" "}
                {timeAgo(c.createdAt)}
              </div>
            </div>
            {c.followUpNeeded && (
              <span className="badge text-smoke shrink-0">
                <Flag
                  className="size-3"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                Follow-up
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function CaseDetail({ id }: { id: number }) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const { openLogCall } = useLogCall();
  const { openNewTask } = useNewTask();
  const [moving, setMoving] = useState<Deadline | null>(null);
  const [drawer, setDrawer] = useState<DrawerItem | null>(null);

  const kase = useApi<Case>(`/cases/${id}`);
  const deadlines = useApi<DeadlineWithChanges[]>(
    `/deadlines?caseId=${id}&includeChanges=true`
  );
  const tasks = useApi<Task[]>(`/tasks?caseId=${id}`);
  const calls = useApi<CallLog[]>(`/call-logs?caseId=${id}`);
  const notes = useApi<Note[]>(`/notes?caseId=${id}`);
  const activity = useApi<Activity[]>(`/activity?caseId=${id}&limit=50`);
  const users = useApi<User[]>("/users");
  const userById = useMemo(
    () => new Map((users.data ?? []).map(u => [u.id, u])),
    [users.data]
  );

  const c = kase.data;
  if (kase.error) {
    return (
      <AppShell title="Case">
        <p role="alert" className="text-sm text-roof">
          Couldn't load this case: {kase.error.message}
        </p>
        <Link
          href="/cases"
          className="link-quiet text-sm text-ink mt-4 inline-block"
        >
          Back to cases
        </Link>
      </AppShell>
    );
  }
  if (!c || !users.data) {
    return (
      <AppShell title="Case">
        <p className="text-sm text-ash">Loading case…</p>
      </AppShell>
    );
  }

  const lead = c.leadAttorneyId ? userById.get(c.leadAttorneyId) : undefined;
  const toucher = c.lastTouchedBy ? userById.get(c.lastTouchedBy) : undefined;
  const latest = activity.data?.[0];
  const stale =
    c.status === "active" && isStale(parseISO(c.lastTouchedAt), today);
  const openDeadlines = (deadlines.data ?? []).filter(d => !d.doneAt).length;
  const openTasks = (tasks.data ?? []).filter(t => t.status === "open").length;

  return (
    <AppShell title="Case">
      <div className="max-w-[1180px] animate-fade-in-up">
        <Link
          href="/cases"
          className="link-quiet inline-flex items-center gap-1.5 text-xs text-smoke mb-8"
        >
          <ArrowLeft className="size-3" strokeWidth={1.5} aria-hidden="true" />{" "}
          All cases
        </Link>

        {/* Header */}
        <header className={cn("mb-12", stale && "status-stale pl-6")}>
          <div className="eyebrow mb-3 flex items-center gap-3">
            {CASE_STATUS_LABELS[c.status]} · {c.causeNo ?? "No cause no."}
            {stale && <StatusBadge status="stale" />}
          </div>
          <h1 className="display text-5xl text-ink mb-5">{c.caption}</h1>
          <dl className="grid grid-cols-4 gap-6 text-sm max-w-4xl mb-5">
            {[
              ["Lead attorney", lead?.name ?? "Unassigned"],
              ["Client", c.clientName],
              ["Type", c.caseType],
              ["Opened", fmtDayYear(c.openedAt)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="eyebrow mb-1">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {c.referredTo && (
            <p className="text-sm text-smoke mb-3">
              Referred to {c.referredTo}
            </p>
          )}
          <p className="text-sm text-smoke" data-testid="last-touched">
            Last touched by{" "}
            <span className="text-ink">{toucher?.name ?? "unknown"}</span>
            {toucher ? ` (${ROLE_LABELS[toucher.role]})` : ""}
            {latest && latest.createdAt === c.lastTouchedAt
              ? ` · ${latest.action}`
              : ""}{" "}
            · {timeAgo(c.lastTouchedAt)}
          </p>
          <div className="flex gap-4 mt-6">
            <button
              type="button"
              className="btn-solid"
              onClick={() => openLogCall({ caseId: c.id })}
            >
              <Phone
                className="size-3.5"
                strokeWidth={1.5}
                aria-hidden="true"
              />{" "}
              Log a call
            </button>
            <a href="#notes-title" className="btn-line">
              Add note
            </a>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-12">
          <div className="col-span-8 space-y-12">
            <Section
              id="deadlines-title"
              label="Deadlines"
              title={`${openDeadlines} open deadline${openDeadlines === 1 ? "" : "s"}`}
            >
              {deadlines.data ? (
                <DeadlineRows
                  rows={deadlines.data}
                  today={today}
                  userById={userById}
                  onMove={setMoving}
                  onOpen={setDrawer}
                />
              ) : (
                <p className="text-sm text-ash">Loading…</p>
              )}
            </Section>

            <Section
              id="tasks-title"
              label="Tasks"
              title={`${openTasks} open task${openTasks === 1 ? "" : "s"}`}

              action={
                <button
                  type="button"
                  className="btn-line"
                  onClick={() => openNewTask({ caseId: c.id })}
                >
                  <Plus
                    className="size-3.5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />{" "}
                  New task
                </button>
              }
            >
              {tasks.data ? (
                <TaskRows
                  tasks={tasks.data}
                  today={today}
                  userById={userById}
                  onOpen={setDrawer}
                />
              ) : (
                <p className="text-sm text-ash">Loading…</p>
              )}
            </Section>

            <Section
              id="calls-title"
              label="Call log"
              title={`${calls.data?.length ?? 0} call${calls.data?.length === 1 ? "" : "s"}`}
              action={
                <button
                  type="button"
                  className="btn-line"
                  onClick={() => openLogCall({ caseId: c.id })}
                >
                  <Phone
                    className="size-3.5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />{" "}
                  Log a call
                </button>
              }
            >
              {calls.data ? (
                <CallRows calls={calls.data} userById={userById} />
              ) : (
                <p className="text-sm text-ash">Loading…</p>
              )}
            </Section>
          </div>

          <div className="col-span-4 space-y-12">
            <Section
              id="notes-title"
              label="Notes"
              title={`${notes.data?.length ?? 0} note${notes.data?.length === 1 ? "" : "s"}`}
            >
              <AddNoteForm caseId={c.id} onAdded={announceDataChanged} />
              <ul className="space-y-4 mt-6">
                {(notes.data ?? []).map(n => (
                  <li key={n.id} className="text-sm">
                    <p className="text-ink">{n.body}</p>
                    <p className="text-xs text-ash mt-0.5">
                      {userById.get(n.userId)?.name} · {fmtDate(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="activity-title" label="Activity" title="Timeline">
              {!activity.data ? (
                <p className="text-sm text-ash">Loading…</p>
              ) : activity.data.length === 0 ? (
                <Empty>No activity yet.</Empty>
              ) : (
                <ol className="space-y-4 border-l border-sand pl-4">
                  {activity.data.map(a => (
                    <li key={a.id} className="text-sm">
                      <p className="text-ink">
                        {userById.get(a.userId)?.name ?? "Someone"} {a.action}
                      </p>
                      {a.detail && (
                        <p className="text-xs text-smoke">{a.detail}</p>
                      )}
                      <p className="text-xs text-ash">
                        {fmtDate(a.createdAt)} · {timeAgo(a.createdAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </div>
        </div>
      </div>

      <DeadlineDateDialog
        deadline={moving}
        onOpenChange={open => !open && setMoving(null)}
      />
      <ItemDrawer
        item={drawer}
        today={today}
        caseById={new Map([[c.id, c]])}
        userById={userById}
        onClose={() => setDrawer(null)}
        onChanged={() => {}}
      />
    </AppShell>
  );
}
