import { toDate } from "./dashboard";
import { daysUntil } from "./status";
import type { Task } from "./types";

/**
 * Today view math: the to-do order and the 8 am–6 pm planner grid.
 * To-do order (PLAN.md): overdue first, then due today, then by priority.
 */

export type TodoGroup = "overdue" | "today" | "upcoming" | "undated";
export const TODO_GROUP_LABELS: Record<TodoGroup, string> = {
  overdue: "Overdue",
  today: "Due today",
  upcoming: "Coming up",
  undated: "No due date",
};

export function todoGroup(t: Task, today: Date): TodoGroup {
  if (!t.dueDate) return "undated";
  const d = daysUntil(toDate(t.dueDate), today);
  return d < 0 ? "overdue" : d === 0 ? "today" : "upcoming";
}

const RANK: Record<TodoGroup, number> = {
  overdue: 0,
  today: 1,
  upcoming: 2,
  undated: 3,
};

/** Open tasks only. Within a group: priority (P1 first), then due date, then id. */
export function sortTodo(tasks: Task[], today: Date): Task[] {
  return tasks
    .filter(t => t.status === "open")
    .sort(
      (a, b) =>
        RANK[todoGroup(a, today)] - RANK[todoGroup(b, today)] ||
        a.priority - b.priority ||
        (a.dueDate ?? "").localeCompare(b.dueDate ?? "") ||
        a.id - b.id
    );
}

// ---- Planner: 8:00–18:00 in 30-minute slots.

export const DAY_START = 8 * 60;
export const DAY_END = 18 * 60;
export const SLOT_MINUTES = 30;

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const toClock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
/** "13:30" → "1:30 pm" */
export const toLabel = (hhmm: string) => {
  const m = toMinutes(hhmm);
  const h = Math.floor(m / 60);
  return `${((h + 11) % 12) + 1}${m % 60 ? `:${String(m % 60).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
};

/** "08:00", "08:30", … "17:30" */
export const SLOTS = Array.from(
  { length: (DAY_END - DAY_START) / SLOT_MINUTES },
  (_, i) => toClock(DAY_START + i * SLOT_MINUTES)
);

/**
 * A block starting at `start`, `minutes` long, kept inside the working day:
 * it never starts before 8 am and never runs past 6 pm (shortened if it must).
 */
export function fitBlock(
  start: string,
  minutes: number
): { start: string; end: string } {
  const len = Math.max(
    SLOT_MINUTES,
    Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES
  );
  const s = Math.min(
    Math.max(toMinutes(start), DAY_START),
    DAY_END - SLOT_MINUTES
  );
  return { start: toClock(s), end: toClock(Math.min(s + len, DAY_END)) };
}

export type PlacedBlock = {
  task: Task;
  start: number;
  end: number;
  lane: number;
  lanes: number;
};

/** Side-by-side lanes for overlapping blocks (like a calendar). */
export function layoutBlocks(tasks: Task[]): PlacedBlock[] {
  const items = tasks
    .filter(t => t.scheduledStart && t.scheduledEnd)
    .map(t => ({
      task: t,
      start: toMinutes(t.scheduledStart!),
      end: toMinutes(t.scheduledEnd!),
    }))
    .sort(
      (a, b) => a.start - b.start || b.end - a.end || a.task.id - b.task.id
    );

  const placed: PlacedBlock[] = [];
  let cluster: PlacedBlock[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map(b => b.lane + 1));
    cluster.forEach(b => (b.lanes = lanes));
    placed.push(...cluster);
    cluster = [];
  };
  for (const it of items) {
    if (it.start >= clusterEnd && cluster.length) flush();
    const laneEnds: number[] = [];
    cluster.forEach(
      b => (laneEnds[b.lane] = Math.max(laneEnds[b.lane] ?? 0, b.end))
    );
    let lane = laneEnds.findIndex(e => e <= it.start);
    if (lane === -1) lane = laneEnds.length;
    cluster.push({ ...it, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  if (cluster.length) flush();
  return placed;
}
