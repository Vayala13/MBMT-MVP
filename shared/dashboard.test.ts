import { describe, expect, it } from "vitest";
import {
  buildStrip,
  countdown,
  metrics,
  myCaseIds,
  shortCaption,
  staleCases,
  upcomingPending,
} from "./dashboard";
import type { Case, Deadline, Task } from "./types";

const today = new Date(2026, 8, 29); // Tue Sep 29 2026

let id = 0;
const deadline = (
  dueDate: string,
  extra: Partial<Deadline> = {}
): Deadline => ({
  id: ++id,
  caseId: 1,
  title: `D${id}`,
  kind: "court_ordered",
  dueDate,
  sourceNote: null,
  assignedTo: null,
  doneAt: null,
  ...extra,
});
const task = (dueDate: string | null, extra: Partial<Task> = {}): Task => ({
  id: ++id,
  caseId: 1,
  parentTaskId: null,
  title: `T${id}`,
  assignedTo: null,
  dueDate,
  scheduledDate: null,
  scheduledStart: null,
  scheduledEnd: null,
  priority: 2,
  status: "open",
  templateId: null,
  ...extra,
});
const kase = (extra: Partial<Case>): Case => ({
  id: ++id,
  caption: "A v. B",
  causeNo: null,
  clientName: "X",
  caseType: "Y",
  status: "active",
  referredTo: null,
  leadAttorneyId: null,
  openedAt: "2020-01-01",
  lastTouchedAt: "2026-09-28T10:00:00.000Z",
  lastTouchedBy: null,
  ...extra,
});

describe("buildStrip", () => {
  const strip = buildStrip(
    [
      deadline("2026-09-29"), // today
      deadline("2026-10-19"), // third-week Monday = last column
      deadline("2026-10-20"), // day 22: off the strip
      deadline("2026-09-28"), // overdue: not on the strip
      deadline("2026-10-01", { doneAt: "2026-09-30T00:00:00Z" }), // done: hidden
    ],
    today
  );

  it("has 21 days in 3 weeks of 7, starting today", () => {
    expect(strip).toHaveLength(21);
    expect(strip[0]).toMatchObject({ date: "2026-09-29", offset: 0, week: 1 });
    expect(strip[7].week).toBe(2);
    expect(strip[14].week).toBe(3);
    expect(strip[20]).toMatchObject({ date: "2026-10-19", week: 3 });
  });

  it("marks weekends", () => {
    expect(strip.filter(d => d.weekend).map(d => d.date)).toEqual([
      "2026-10-03",
      "2026-10-04",
      "2026-10-10",
      "2026-10-11",
      "2026-10-17",
      "2026-10-18",
    ]);
  });

  it("places only open deadlines inside the window, with status", () => {
    expect(strip.flatMap(d => d.deadlines)).toHaveLength(2);
    expect(strip[0].deadlines[0].status).toBe("soon");
    expect(strip[20].deadlines[0].status).toBe("ok");
  });
});

describe("countdown", () => {
  it("lists open deadlines by date, overdue first, capped", () => {
    const rows = countdown(
      [
        deadline("2026-10-05"),
        deadline("2026-09-25"),
        deadline("2026-09-30"),
        deadline("2026-09-20", { doneAt: "x" }),
      ],
      today,
      2
    );
    expect(rows.map(r => [r.deadline.dueDate, r.days, r.status])).toEqual([
      ["2026-09-25", -4, "overdue"],
      ["2026-09-30", 1, "soon"],
    ]);
  });
});

describe("staleCases", () => {
  it("returns active cases untouched > 365 days, oldest first", () => {
    const rows = staleCases(
      [
        kase({ caption: "recent" }),
        kase({ caption: "older", lastTouchedAt: "2025-01-01T10:00:00Z" }),
        kase({ caption: "oldest", lastTouchedAt: "2024-06-01T10:00:00Z" }),
        kase({
          caption: "closed",
          status: "closed",
          lastTouchedAt: "2020-01-01T10:00:00Z",
        }),
        kase({
          caption: "exactly a year",
          lastTouchedAt: "2025-09-29T10:00:00Z",
        }),
      ],
      today
    );
    expect(rows.map(c => c.caption)).toEqual(["oldest", "older"]);
  });
});

describe("metrics", () => {
  it("counts cases and open/overdue tasks", () => {
    const m = metrics(
      [kase({}), kase({ status: "inquiry" })],
      [
        task("2026-09-28"),
        task("2026-09-29"),
        task(null),
        task("2026-09-01", { status: "done" }),
      ],
      today
    );
    expect(m).toEqual({
      totalCases: 2,
      activeCases: 1,
      openTasks: 3,
      overdueTasks: 1,
    });
  });
});

describe("upcomingPending", () => {
  it("groups open items due in the next 30 days (plus overdue) by case, earliest first", () => {
    const groups = upcomingPending(
      [
        task("2026-09-30", { caseId: 2 }),
        task("2026-10-28", { caseId: 2 }), // day 29: last day in the window
        task("2026-10-29", { caseId: 2 }), // day 30: outside
        task("2026-09-10", { caseId: 1, status: "done" }),
      ],
      [
        deadline("2026-09-28", { caseId: 1 }),
        deadline("2026-09-30", { caseId: 2 }),
        deadline("2026-08-31", { caseId: 3 }), // long overdue: still pending
      ],
      today
    );
    expect(
      groups.map(g => [g.caseId, g.items.map(i => `${i.kind}:${i.dueDate}`)])
    ).toEqual([
      [3, ["deadline:2026-08-31"]],
      [1, ["deadline:2026-09-28"]],
      [2, ["deadline:2026-09-30", "task:2026-09-30", "task:2026-10-28"]],
    ]);
    expect(groups[0].items[0].status).toBe("overdue");
  });
});

describe("shortCaption", () => {
  it("picks a short, recognisable name", () => {
    expect(shortCaption("Quillfeather v. Bramblewood Transit LLC")).toBe(
      "Quillfeather"
    );
    expect(shortCaption("Pollywog Café LLC v. Hartwell Leasing")).toBe(
      "Pollywog"
    );
    expect(shortCaption("Wickersham — slip and fall inquiry")).toBe(
      "Wickersham"
    );
    expect(shortCaption("Estate of Ambrose Figwort")).toBe("Ambrose");
  });
});

describe("myCaseIds (My work)", () => {
  it("includes cases I lead and cases where I have open work", () => {
    const led = kase({ leadAttorneyId: 9 });
    const other = kase({});
    const ids = myCaseIds(
      9,
      [led, other, kase({})],
      [
        task(null, { caseId: other.id, assignedTo: 9 }),
        task(null, { caseId: 777, assignedTo: 9, status: "done" }),
      ],
      [
        deadline("2026-10-01", { caseId: 555, assignedTo: 9 }),
        deadline("2026-10-01", { caseId: 666, assignedTo: 9, doneAt: "x" }),
      ]
    );
    expect([...ids].sort((a, b) => a - b)).toEqual(
      [led.id, other.id, 555].sort((a, b) => a - b)
    );
  });
});
