import { addDays } from "date-fns";
import { describe, expect, it } from "vitest";
import { ymd } from "./dates";
import {
  CITE_CHECK_TITLE,
  ensureCiteCheck,
  fridayIfWeekend,
  planFromTemplate,
  subtaskDueDate,
} from "./templates";

const MSJ_REPLY = [
  { title: "Pull and label exhibits (A, B, C…)", offset_days_before_due: 8 },
  { title: "Check in with attorney on progress", offset_days_before_due: 6 },
  { title: "Draft reply", offset_days_before_due: 4 },
  { title: "Cite-check every authority", offset_days_before_due: 2 },
  { title: "Final review", offset_days_before_due: 1 },
  { title: "File", offset_days_before_due: 0 },
];

describe("fridayIfWeekend", () => {
  it("moves Sat and Sun to the Friday before, leaves weekdays", () => {
    expect(ymd(fridayIfWeekend(new Date(2026, 9, 17)))).toBe("2026-10-16"); // Sat → Fri
    expect(ymd(fridayIfWeekend(new Date(2026, 9, 18)))).toBe("2026-10-16"); // Sun → Fri
    expect(ymd(fridayIfWeekend(new Date(2026, 9, 14)))).toBe("2026-10-14"); // Wed
  });
});

describe("subtaskDueDate", () => {
  it("counts back calendar days from the parent due date", () => {
    expect(subtaskDueDate("2026-10-19", 0)).toBe("2026-10-19");
    expect(subtaskDueDate("2026-10-19", 4)).toBe("2026-10-15");
  });
});

describe("MSJ Reply due in 10 days (PLAN.md Phase 4 done-check)", () => {
  // Tue Sep 29 2026 + 10 days = Fri Oct 9 2026
  const due = ymd(addDays(new Date(2026, 8, 29), 10));

  it("creates every subtask with the right date", () => {
    expect(due).toBe("2026-10-09");
    expect(planFromTemplate(MSJ_REPLY, due)).toEqual([
      {
        title: "Pull and label exhibits (A, B, C…)",
        offset: 8,
        dueDate: "2026-10-01",
      }, // Thu
      {
        title: "Check in with attorney on progress",
        offset: 6,
        dueDate: "2026-10-02",
      }, // Sat 3rd → Fri 2nd
      { title: "Draft reply", offset: 4, dueDate: "2026-10-05" }, // Mon
      { title: "Cite-check every authority", offset: 2, dueDate: "2026-10-07" }, // Wed
      { title: "Final review", offset: 1, dueDate: "2026-10-08" }, // Thu
      { title: "File", offset: 0, dueDate: "2026-10-09" }, // Fri
    ]);
  });

  it("never schedules a subtask after the parent or on a weekend", () => {
    for (const offset of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      for (const parent of ["2026-10-05", "2026-10-09", "2026-10-19"]) {
        const d = subtaskDueDate(parent, offset);
        expect(d <= parent).toBe(true);
        const wd = new Date(`${d}T12:00:00`).getDay();
        expect([0, 6]).not.toContain(wd);
      }
    }
  });

  it("keeps template order when two subtasks land on the same Friday", () => {
    const plan = planFromTemplate(
      [
        { title: "A", offset_days_before_due: 2 }, // Sat → Fri
        { title: "B", offset_days_before_due: 3 }, // Fri
      ],
      "2026-10-19" // Mon
    );
    expect(plan.map(p => [p.title, p.dueDate])).toEqual([
      ["A", "2026-10-16"],
      ["B", "2026-10-16"],
    ]);
  });
});

describe("ensureCiteCheck (firm policy)", () => {
  it("adds a cite-check after the last drafting step when missing", () => {
    const { subtasks, added } = ensureCiteCheck([
      { title: "Review responses", offset_days_before_due: 7 },
      { title: "Draft motion", offset_days_before_due: 5 },
      { title: "File", offset_days_before_due: 0 },
    ]);
    expect(added).toBe(true);
    expect(subtasks.map(s => s.title)).toEqual([
      "Review responses",
      "Draft motion",
      CITE_CHECK_TITLE,
      "File",
    ]);
    expect(subtasks[2].offset_days_before_due).toBe(3);
  });

  it("leaves templates alone that already have one, or have no drafting", () => {
    expect(
      ensureCiteCheck([
        { title: "Draft reply", offset_days_before_due: 4 },
        { title: "Cite check", offset_days_before_due: 2 },
      ]).added
    ).toBe(false);
    expect(
      ensureCiteCheck([
        { title: "Pull file from storage", offset_days_before_due: 1 },
      ]).added
    ).toBe(false);
  });

  it("never gives the cite-check a negative offset", () => {
    const { subtasks } = ensureCiteCheck([
      { title: "Draft and file", offset_days_before_due: 1 },
    ]);
    expect(subtasks[1].offset_days_before_due).toBe(0);
  });
});
