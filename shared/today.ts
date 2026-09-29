import { toDate } from "./dashboard";
import { daysUntil } from "./status";
import type { Task } from "./types";

/**
 * Today view math: the to-do order and the 8 am – 11:59 pm planner grid.
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
/**
 * Workday ends at 11:59 pm. Internally the end is midnight (24:00) so the
 * last half-hour slot (11:30) works like the others; any time at or past
 * midnight is saved and shown as 23:59 / "11:59 pm" (see toClock).
 */
export const DAY_END = 24 * 60;
export const SLOT_MINUTES = 30;

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const toClock = (minutes: number) =>
  minutes >= DAY_END
    ? "23:59"
    : `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
/** "13:30" → "1:30 pm" */
export const toLabel = (hhmm: string) => {
  const m = toMinutes(hhmm);
  const h = Math.floor(m / 60);
  return `${((h + 11) % 12) + 1}${m % 60 ? `:${String(m % 60).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
};

/** "08:00", "08:30", … "23:30" */
export const SLOTS = Array.from(
  { length: (DAY_END - DAY_START) / SLOT_MINUTES },
  (_, i) => toClock(DAY_START + i * SLOT_MINUTES)
);

/**
 * A block starting at `start`, `minutes` long, kept inside the working day:
 * it never starts before 8 am and never runs past 11:59 pm (shortened if it must).
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

// ---- "Plan my day for me"

export const AUTO_BLOCK_MINUTES = 60;

export type AutoPlanItem = { taskId: number; start: string; end: string };

/**
 * Fills the rest of today in to-do order (overdue → due today → priority),
 * up to one hour per task, starting at the next half hour (not before 8 am).
 * Gaps between blocks already planned get filled too (a 30-minute gap gets
 * a 30-minute block), and nothing runs past 11:59 pm.
 * Skips tasks already planned today and parent tasks whose subtasks are
 * still open (the subtasks get planned instead).
 */
export function autoPlan(
  tasks: Task[],
  today: Date,
  todayYmd: string,
  nowMinutes: number,
  blockMinutes = AUTO_BLOCK_MINUTES
): AutoPlanItem[] {
  const plannedToday = (t: Task) =>
    t.scheduledDate === todayYmd && t.scheduledStart && t.scheduledEnd;
  const hasOpenSubtasks = new Set(
    tasks
      .filter(t => t.status === "open" && t.parentTaskId)
      .map(t => t.parentTaskId!)
  );
  const busy = tasks
    .filter(plannedToday)
    .map(
      t => [toMinutes(t.scheduledStart!), toMinutes(t.scheduledEnd!)] as const
    )
    .sort((a, b) => a[0] - b[0]);

  const candidates = sortTodo(tasks, today).filter(
    t => !plannedToday(t) && !hasOpenSubtasks.has(t.id)
  );

  let cursor = Math.max(
    DAY_START,
    Math.ceil(nowMinutes / SLOT_MINUTES) * SLOT_MINUTES
  );
  const plan: AutoPlanItem[] = [];
  for (const t of candidates) {
    // Find the next free gap of at least 30 minutes. The top priority starts
    // as soon as possible: a short gap gets a shorter block rather than
    // pushing the task later.
    let placed = false;
    while (cursor + SLOT_MINUTES <= DAY_END) {
      const inside = busy.find(([s, e]) => s <= cursor && e > cursor);
      if (inside) {
        cursor = inside[1];
        continue;
      }
      const nextBusy = busy.find(([s]) => s > cursor)?.[0] ?? DAY_END;
      const free = Math.min(nextBusy, DAY_END) - cursor;
      if (free < SLOT_MINUTES) {
        cursor = nextBusy;
        continue;
      }
      const len = Math.min(blockMinutes, free);
      plan.push({
        taskId: t.id,
        start: toClock(cursor),
        end: toClock(cursor + len),
      });
      cursor += len;
      placed = true;
      break;
    }
    if (!placed) break;
  }
  return plan;
}

/** "8 am" / "11:59 pm", for labels. */
export const DAY_START_LABEL = toLabel(toClock(DAY_START));
export const DAY_END_LABEL = toLabel(toClock(DAY_END));
