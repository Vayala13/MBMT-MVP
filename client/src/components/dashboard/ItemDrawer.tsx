import AddNoteForm from "@/components/AddNoteForm";
import StatusBadge from "@/components/StatusBadge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useApi } from "@/hooks/useApi";
import { announceDataChanged } from "@/lib/dataEvents";
import { fmtDate, fmtDay, fmtShort, timeAgo } from "@/lib/format";
import { toDate } from "@shared/dashboard";
import { ROLE_LABELS } from "@shared/enums";
import { deadlineStatus, relativeDueLabel } from "@shared/status";
import type {
  Activity,
  Case,
  Deadline,
  DeadlineChange,
  Note,
  Task,
  User,
} from "@shared/types";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { Link } from "wouter";
import type { DrawerItem } from "./types";

const KIND_LABEL = {
  deadline: "Deadline",
  task: "Task",
  case: "Case",
} as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-sand pt-5">
      <h3 className="eyebrow mb-3">{title}</h3>
      {children}
    </section>
  );
}

function DeadlineDetail({
  id,
  today,
  userById,
}: {
  id: number;
  today: Date;
  userById: Map<number, User>;
}) {
  const { data } = useApi<Deadline & { changes: DeadlineChange[] }>(
    `/deadlines/${id}`
  );
  if (!data) return <p className="text-sm text-ash">Loading…</p>;
  const due = toDate(data.dueDate);
  const status = data.doneAt ? null : deadlineStatus(due, today);
  const who = data.assignedTo ? userById.get(data.assignedTo)?.name : undefined;
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-3">
        {status && <StatusBadge status={status} />}
        <span className="text-ink">
          {fmtDay(data.dueDate)} ·{" "}
          {data.doneAt ? "done" : relativeDueLabel(due, today)}
        </span>
      </div>
      <div className="text-smoke">
        {data.kind.replace("_", " ")}
        {who ? ` · assigned to ${who}` : ""}
      </div>
      {data.sourceNote && (
        <div className="text-ash">Source: {data.sourceNote}</div>
      )}
      {data.changes.map(ch => (
        <div key={ch.id} className="text-smoke flex items-center gap-1.5">
          Moved from {fmtShort(ch.oldDate)}
          <ArrowRight className="size-3" strokeWidth={1.5} aria-label="to" />
          {fmtShort(ch.newDate)} · {ch.reason}
          <span className="text-ash">· {userById.get(ch.changedBy)?.name}</span>
        </div>
      ))}
    </div>
  );
}

function TaskDetail({
  id,
  today,
  userById,
}: {
  id: number;
  today: Date;
  userById: Map<number, User>;
}) {
  const { data } = useApi<Task & { subtasks: Task[] }>(`/tasks/${id}`);
  if (!data) return <p className="text-sm text-ash">Loading…</p>;
  const who = data.assignedTo ? userById.get(data.assignedTo)?.name : undefined;
  const status =
    data.dueDate && data.status === "open"
      ? deadlineStatus(toDate(data.dueDate), today)
      : null;
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-3">
        {status && <StatusBadge status={status} />}
        <span className="text-ink">
          {data.dueDate
            ? `${fmtDay(data.dueDate)} · ${relativeDueLabel(toDate(data.dueDate), today)}`
            : "No due date"}
        </span>
      </div>
      <div className="text-smoke">
        Priority {data.priority}
        {who ? ` · assigned to ${who}` : ""} · {data.status}
      </div>
      {data.subtasks.length > 0 && (
        <ul className="pt-2 space-y-1.5">
          {data.subtasks.map(s => {
            const Icon = s.status === "done" ? CheckCircle2 : Circle;
            return (
              <li key={s.id} className="flex items-start gap-2 text-smoke">
                <Icon
                  className="size-3.5 mt-0.5 shrink-0 text-ash"
                  strokeWidth={1.5}
                  aria-label={s.status}
                />
                <span className="flex-1">{s.title}</span>
                {s.dueDate && (
                  <span className="text-ash tabular-nums">
                    {fmtShort(s.dueDate)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ItemDrawer({
  item,
  today,
  caseById,
  userById,
  onClose,
  onChanged,
}: {
  item: DrawerItem | null;
  today: Date;
  caseById: Map<number, Case>;
  userById: Map<number, User>;
  onClose: () => void;
  onChanged: () => void;
}) {
  const caseId = item?.caseId ?? null;
  const notes = useApi<Note[]>(caseId ? `/notes?caseId=${caseId}` : null);
  const activity = useApi<Activity[]>(
    caseId ? `/activity?caseId=${caseId}&limit=15` : null
  );
  const c = caseId ? caseById.get(caseId) : undefined;

  const latest = activity.data?.[0];
  const toucher = c?.lastTouchedBy ? userById.get(c.lastTouchedBy) : undefined;

  // Every open list (drawer, dashboard, case page) refetches on this signal.
  const refresh = () => {
    announceDataChanged();
    onChanged();
  };

  return (
    <Sheet open={item !== null} onOpenChange={open => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[30rem] sm:max-w-[30rem] p-0 gap-0 overflow-y-auto"
      >
        {item && (
          <div className="p-8 pb-20 space-y-6">
            <div>
              <div className="eyebrow mb-3">{KIND_LABEL[item.kind]}</div>
              <SheetTitle className="display text-3xl text-ink font-extralight leading-tight">
                {item.title}
              </SheetTitle>
              <SheetDescription className="text-sm text-smoke mt-2">
                {item.kind === "case"
                  ? (c?.causeNo ?? c?.caseType)
                  : c?.caption}
              </SheetDescription>
            </div>

            {item.kind === "deadline" && (
              <DeadlineDetail id={item.id} today={today} userById={userById} />
            )}
            {item.kind === "task" && (
              <TaskDetail id={item.id} today={today} userById={userById} />
            )}

            {c && (
              <div className="stone-card p-4 text-sm">
                <div className="text-ink">{c.caption}</div>
                <div className="text-xs text-ash mt-1">
                  {c.causeNo ?? "No cause no."} · {c.caseType} ·{" "}
                  {c.status.replace("_", " ")}
                </div>
                <div className="text-xs text-smoke mt-2">
                  Last touched by {toucher?.name ?? "unknown"}
                  {toucher ? ` (${ROLE_LABELS[toucher.role]})` : ""}
                  {latest && latest.createdAt === c.lastTouchedAt
                    ? ` · ${latest.action}`
                    : ""}{" "}
                  · {timeAgo(c.lastTouchedAt)}
                </div>
                <Link
                  href={`/cases/${c.id}`}
                  className="link-quiet inline-flex items-center gap-1.5 text-xs text-ink mt-3"
                >
                  Open case{" "}
                  <ArrowRight
                    className="size-3"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Link>
              </div>
            )}

            {caseId && (
              <Section title="Add note">
                <AddNoteForm
                  caseId={caseId}
                  taskId={item.kind === "task" ? item.id : undefined}
                  onAdded={refresh}
                />
              </Section>
            )}

            <Section title="Notes">
              {!notes.data ? (
                <p className="text-sm text-ash">Loading…</p>
              ) : notes.data.length === 0 ? (
                <p className="font-serif italic text-lg text-smoke">
                  No notes yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {notes.data.map(n => (
                    <li key={n.id} className="text-sm">
                      <p className="text-ink">{n.body}</p>
                      <p className="text-xs text-ash mt-0.5">
                        {userById.get(n.userId)?.name} · {fmtDate(n.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Activity">
              {!activity.data ? (
                <p className="text-sm text-ash">Loading…</p>
              ) : activity.data.length === 0 ? (
                <p className="font-serif italic text-lg text-smoke">
                  No activity yet.
                </p>
              ) : (
                <ol className="space-y-3 border-l border-sand pl-4">
                  {activity.data.map(a => (
                    <li key={a.id} className="text-sm">
                      <p className="text-ink">
                        {userById.get(a.userId)?.name ?? "Someone"} {a.action}
                      </p>
                      {a.detail && (
                        <p className="text-xs text-smoke">{a.detail}</p>
                      )}
                      <p className="text-xs text-ash">{timeAgo(a.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
