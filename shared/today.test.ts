import { describe, expect, it } from "vitest";
import {
  autoPlan,
  fitBlock,
  layoutBlocks,
  SLOTS,
  sortTodo,
  toLabel,
  todoGroup,
} from "./today";
import type { Task } from "./types";

const today = new Date(2026, 8, 29); // Tue
let id = 0;
const task = (extra: Partial<Task>): Task => ({
  id: ++id,
  caseId: 1,
  parentTaskId: null,
  title: `T${id}`,
  assignedTo: 1,
  dueDate: null,
  scheduledDate: null,
  scheduledStart: null,
  scheduledEnd: null,
  priority: 2,
  status: "open",
  templateId: null,
  ...extra,
});

describe("sortTodo", () => {
  it("puts overdue first, then due today, then the rest by priority", () => {
    const rows = sortTodo(
      [
        task({ title: "later P1", dueDate: "2026-10-05", priority: 1 }),
        task({ title: "today P3", dueDate: "2026-09-29", priority: 3 }),
        task({ title: "overdue P2", dueDate: "2026-09-25", priority: 2 }),
        task({ title: "later P3", dueDate: "2026-09-30", priority: 3 }),
        task({ title: "no date", priority: 1 }),
        task({ title: "overdue P1", dueDate: "2026-09-28", priority: 1 }),
        task({ title: "done", dueDate: "2026-09-20", status: "done" }),
      ],
      today
    );
    expect(rows.map(t => t.title)).toEqual([
      "overdue P1",
      "overdue P2",
      "today P3",
      "later P1",
      "later P3",
      "no date",
    ]);
    expect(todoGroup(rows[2], today)).toBe("today");
  });
});

describe("planner grid", () => {
  it("has 20 half-hour slots from 8 am to 5:30 pm (grid ends 6 pm)", () => {
    expect(SLOTS).toHaveLength(20);
    expect(SLOTS[0]).toBe("08:00");
    expect(SLOTS.at(-1)).toBe("17:30");
    expect(toLabel("13:30")).toBe("1:30 pm");
    expect(toLabel("08:00")).toBe("8 am");
    expect(toLabel("12:00")).toBe("12 pm");
  });

  it("fits a 2-hour block and keeps it inside the day", () => {
    expect(fitBlock("09:00", 120)).toEqual({ start: "09:00", end: "11:00" });
    expect(fitBlock("17:00", 120)).toEqual({ start: "17:00", end: "18:00" });
    expect(fitBlock("19:00", 60)).toEqual({ start: "17:30", end: "18:00" });
    expect(fitBlock("07:00", 60)).toEqual({ start: "08:00", end: "09:00" });
    expect(fitBlock("10:00", 10)).toEqual({ start: "10:00", end: "10:30" });
  });
});

describe("layoutBlocks", () => {
  it("puts overlapping blocks side by side, separate ones full width", () => {
    const a = task({ scheduledStart: "09:00", scheduledEnd: "11:00" });
    const b = task({ scheduledStart: "10:00", scheduledEnd: "10:30" });
    const c = task({ scheduledStart: "13:00", scheduledEnd: "14:00" });
    const placed = layoutBlocks([c, b, a]);
    const by = (t: Task) => placed.find(p => p.task.id === t.id)!;
    expect([by(a).lane, by(a).lanes]).toEqual([0, 2]);
    expect([by(b).lane, by(b).lanes]).toEqual([1, 2]);
    expect([by(c).lane, by(c).lanes]).toEqual([0, 1]);
  });
});

describe("autoPlan (Plan my day for me)", () => {
  const Y = "2026-09-29";
  const nine = 9 * 60;

  it("fills the day in priority order, an hour each, from the next half hour", () => {
    const tasks = [
      task({ id: 101, title: "later P2", dueDate: "2026-10-05", priority: 2 }),
      task({
        id: 102,
        title: "overdue P1",
        dueDate: "2026-09-25",
        priority: 1,
      }),
      task({ id: 103, title: "today P3", dueDate: "2026-09-29", priority: 3 }),
    ];
    expect(autoPlan(tasks, today, Y, nine + 10)).toEqual([
      { taskId: 102, start: "09:30", end: "10:30" },
      { taskId: 103, start: "10:30", end: "11:30" },
      { taskId: 101, start: "11:30", end: "12:30" },
    ]);
  });

  it("works around blocks already planned and skips tasks already planned", () => {
    const tasks = [
      task({ id: 201, dueDate: "2026-09-28", priority: 1 }),
      task({
        id: 202,
        dueDate: "2026-09-28",
        priority: 2,
        scheduledDate: Y,
        scheduledStart: "09:00",
        scheduledEnd: "10:30",
      }),
      task({ id: 203, dueDate: "2026-10-01", priority: 1 }),
    ];
    expect(autoPlan(tasks, today, Y, 8 * 60)).toEqual([
      { taskId: 201, start: "08:00", end: "09:00" },
      { taskId: 203, start: "10:30", end: "11:30" },
    ]);
  });

  it("starts the top priority in a short gap instead of pushing it later", () => {
    const tasks = [
      task({ id: 251, dueDate: "2026-09-28", priority: 1 }),
      task({ id: 252, dueDate: "2026-09-28", priority: 2 }),
      task({
        id: 253,
        scheduledDate: Y,
        scheduledStart: "10:00",
        scheduledEnd: "11:00",
      }),
    ];
    expect(autoPlan(tasks, today, Y, nine + 10)).toEqual([
      { taskId: 251, start: "09:30", end: "10:00" },
      { taskId: 252, start: "11:00", end: "12:00" },
    ]);
  });

  it("plans subtasks, not a parent that still has open subtasks", () => {
    const tasks = [
      task({ id: 301, title: "MSJ Reply", dueDate: "2026-10-09", priority: 1 }),
      task({ id: 302, parentTaskId: 301, dueDate: "2026-10-01", priority: 1 }),
    ];
    expect(autoPlan(tasks, today, Y, nine).map(p => p.taskId)).toEqual([302]);
  });

  it("stops at the 5 pm clock-out (the 5-6 pm stay-late hour is manual only)", () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      task({ id: 400 + i, dueDate: "2026-09-29" })
    );
    expect(autoPlan(many, today, Y, 15 * 60 + 5)).toEqual([
      { taskId: 400, start: "15:30", end: "16:30" },
      { taskId: 401, start: "16:30", end: "17:00" },
    ]);
    expect(autoPlan(many, today, Y, 17 * 60 + 5)).toEqual([]);
  });

  it("ignores done tasks", () => {
    expect(
      autoPlan(
        [task({ id: 501, status: "done", dueDate: "2026-09-29" })],
        today,
        Y,
        nine
      )
    ).toEqual([]);
  });
});
