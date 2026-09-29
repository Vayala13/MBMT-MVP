import { describe, expect, it } from "vitest";
import {
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
  it("has 20 half-hour slots from 8 am to 5:30 pm", () => {
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
