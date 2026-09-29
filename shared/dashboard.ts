import { addDays, format, getDay, parseISO } from "date-fns";
import { daysUntil, deadlineStatus, isStale, type Status } from "./status";
import type { Case, Deadline, Task } from "./types";

/**
 * Pure dashboard math, shared so it can be unit-tested.
 * All "YYYY-MM-DD" strings are read as local calendar dates.
 */

/** The strip covers today plus the next 20 days: 3 weeks of 7 days. */
export const STRIP_DAYS = 21;
export const COUNTDOWN_LIMIT = 10;

export const toDate = (ymd: string) => parseISO(ymd);
export const toYmd = (d: Date) => format(d, "yyyy-MM-dd");

const isOpenDeadline = (d: Deadline) => d.doneAt === null;
const isOpenTask = (t: Task) => t.status === "open";
const byDueThenId =
  <T extends { id: number }>(due: (x: T) => string) =>
  (a: T, b: T) =>
    due(a).localeCompare(due(b)) || a.id - b.id;

export type StripDay = {
  date: string;
  /** 0 = today */
  offset: number;
  week: 1 | 2 | 3;
  weekend: boolean;
  deadlines: { deadline: Deadline; status: Exclude<Status, "stale"> }[];
};

export function buildStrip(deadlines: Deadline[], today: Date): StripDay[] {
  const open = deadlines
    .filter(isOpenDeadline)
    .sort(byDueThenId(d => d.dueDate));
  return Array.from({ length: STRIP_DAYS }, (_, offset) => {
    const day = addDays(today, offset);
    const date = toYmd(day);
    return {
      date,
      offset,
      week: (Math.floor(offset / 7) + 1) as 1 | 2 | 3,
      weekend: getDay(day) === 0 || getDay(day) === 6,
      deadlines: open
        .filter(d => d.dueDate === date)
        .map(deadline => ({
          deadline,
          status: deadlineStatus(toDate(deadline.dueDate), today),
        })),
    };
  });
}

export type CountdownRow = {
  deadline: Deadline;
  days: number;
  status: Exclude<Status, "stale">;
};

/** Next open deadlines by date. Overdue ones come first because they are earliest. */
export function countdown(
  deadlines: Deadline[],
  today: Date,
  limit = COUNTDOWN_LIMIT
): CountdownRow[] {
  return deadlines
    .filter(isOpenDeadline)
    .sort(byDueThenId(d => d.dueDate))
    .slice(0, limit)
    .map(deadline => {
      const due = toDate(deadline.dueDate);
      return {
        deadline,
        days: daysUntil(due, today),
        status: deadlineStatus(due, today),
      };
    });
}

/** Active cases untouched for over a year, longest-untouched first. */
export function staleCases(cases: Case[], today: Date): Case[] {
  return cases
    .filter(
      c => c.status === "active" && isStale(parseISO(c.lastTouchedAt), today)
    )
    .sort((a, b) => a.lastTouchedAt.localeCompare(b.lastTouchedAt));
}

export type Metrics = {
  totalCases: number;
  activeCases: number;
  overdueTasks: number;
  openTasks: number;
};

export function metrics(cases: Case[], tasks: Task[], today: Date): Metrics {
  const open = tasks.filter(isOpenTask);
  return {
    totalCases: cases.length,
    activeCases: cases.filter(c => c.status === "active").length,
    openTasks: open.length,
    overdueTasks: open.filter(
      t => t.dueDate && daysUntil(toDate(t.dueDate), today) < 0
    ).length,
  };
}

export type PendingItem =
  | {
      kind: "deadline";
      item: Deadline;
      dueDate: string;
      status: Exclude<Status, "stale">;
    }
  | {
      kind: "task";
      item: Task;
      dueDate: string;
      status: Exclude<Status, "stale">;
    };

export type PendingGroup = { caseId: number; items: PendingItem[] };

/** Rolling window for the "pending" section (decided over a calendar month, which runs dry at month end). */
export const PENDING_DAYS = 30;

/**
 * Open tasks and deadlines due in the next 30 days (today + 29), plus anything
 * already overdue, grouped by case (earliest first).
 */
export function upcomingPending(
  tasks: Task[],
  deadlines: Deadline[],
  today: Date,
  days = PENDING_DAYS
): PendingGroup[] {
  const inWindow = (ymd: string) => daysUntil(toDate(ymd), today) < days;
  const items: PendingItem[] = [
    ...deadlines
      .filter(d => isOpenDeadline(d) && inWindow(d.dueDate))
      .map(d => ({
        kind: "deadline" as const,
        item: d,
        dueDate: d.dueDate,
        status: deadlineStatus(toDate(d.dueDate), today),
      })),
    ...tasks
      .filter(t => isOpenTask(t) && t.dueDate !== null && inWindow(t.dueDate))
      .map(t => ({
        kind: "task" as const,
        item: t,
        dueDate: t.dueDate!,
        status: deadlineStatus(toDate(t.dueDate!), today),
      })),
  ].sort(
    (a, b) =>
      a.dueDate.localeCompare(b.dueDate) ||
      (a.kind === b.kind ? 0 : a.kind === "deadline" ? -1 : 1)
  );

  const groups = new Map<number, PendingItem[]>();
  for (const it of items) {
    const list = groups.get(it.item.caseId) ?? [];
    list.push(it);
    groups.set(it.item.caseId, list);
  }
  return [...groups].map(([caseId, list]) => ({ caseId, items: list }));
}

/** "Quillfeather v. Bramblewood Transit LLC" → "Quillfeather" (for tight chips). */
export function shortCaption(caption: string): string {
  const head = caption
    .split(/ v\. | — /)[0]
    .replace(/^(Estate of|In re|Matter of)\s+/i, "");
  return head.split(/\s+/)[0].replace(/[,.]$/, "");
}

/**
 * "My work": the cases a person is on, meaning they lead it, or they have an
 * open task or open deadline assigned to them there.
 */
export function myCaseIds(
  userId: number,
  cases: Case[],
  tasks: Task[],
  deadlines: Deadline[]
): Set<number> {
  const ids = new Set<number>();
  for (const c of cases) if (c.leadAttorneyId === userId) ids.add(c.id);
  for (const t of tasks)
    if (t.assignedTo === userId && t.status === "open") ids.add(t.caseId);
  for (const d of deadlines)
    if (d.assignedTo === userId && !d.doneAt) ids.add(d.caseId);
  return ids;
}
