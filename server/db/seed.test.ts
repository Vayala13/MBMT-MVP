import { deadlineStatus, isStale } from "@shared/status";
import { getDay, parseISO } from "date-fns";
import { describe, expect, it } from "vitest";
import { openDb } from "./client";
import { cases, deadlineChanges, deadlines, tasks, users } from "./schema";
import { seed } from "./seed";

// Seed against several weekdays so the relative-date logic holds all week.
const DAYS = [
  new Date(2026, 8, 28), // Mon
  new Date(2026, 8, 30), // Wed
  new Date(2026, 9, 2), // Fri
  new Date(2026, 9, 3), // Sat
  new Date(2026, 9, 4), // Sun
];

describe.each(DAYS)("seed(today = %s)", today => {
  const db = openDb(":memory:");
  seed(db, today);
  const allCases = db.select().from(cases).all();
  const allDeadlines = db.select().from(deadlines).all();
  const count = (s: string) => allCases.filter(c => c.status === s).length;

  it("has 6 users covering every role, with 2 attorneys", () => {
    const all = db.select().from(users).all();
    expect(all).toHaveLength(6);
    expect(all.filter(u => u.role === "attorney")).toHaveLength(2);
    const roles = new Set(all.map(u => u.role));
    expect(roles).toEqual(
      new Set(["attorney", "paralegal", "file_clerk", "admin"])
    );
  });

  it("has 25 cases: 15 active, 6 intake (2 referred out), 4 closed", () => {
    expect(allCases).toHaveLength(25);
    expect(count("active")).toBe(15);
    expect(count("inquiry") + count("consult") + count("referred_out")).toBe(6);
    expect(count("referred_out")).toBe(2);
    expect(count("closed")).toBe(4);
  });

  it("has exactly 3 stale active cases", () => {
    const stale = allCases.filter(
      c => c.status === "active" && isStale(parseISO(c.lastTouchedAt), today)
    );
    expect(stale).toHaveLength(3);
  });

  it("has exactly 4 overdue open deadlines", () => {
    const overdue = allDeadlines.filter(
      d => !d.doneAt && deadlineStatus(parseISO(d.dueDate), today) === "overdue"
    );
    expect(overdue).toHaveLength(4);
  });

  it("has a deadline on the third-week Monday (strip days 15–21 = offsets 14–20)", () => {
    const hit = allDeadlines.find(d => {
      const due = parseISO(d.dueDate);
      const days = Math.round(
        (due.getTime() - new Date(today).setHours(0, 0, 0, 0)) / 864e5
      );
      return days >= 14 && days <= 20 && getDay(due) === 1;
    });
    expect(hit?.title).toBe("Reply in support of MSJ");
  });

  it("has one deadline moved by Rule 11 agreement, with history", () => {
    const changes = db.select().from(deadlineChanges).all();
    expect(changes).toHaveLength(1);
    expect(changes[0].reason).toBe("Rule 11 agreement");
    const moved = allDeadlines.find(d => d.id === changes[0].deadlineId)!;
    expect(moved.kind).toBe("rule_11");
    expect(moved.dueDate).toBe(changes[0].newDate);
  });

  it("never schedules an open deadline on a weekend", () => {
    for (const d of allDeadlines.filter(d => !d.doneAt)) {
      expect([0, 6]).not.toContain(getDay(parseISO(d.dueDate)));
    }
  });

  it("splits lead attorney duties between both attorneys", () => {
    const leads = new Set(allCases.map(c => c.leadAttorneyId).filter(Boolean));
    expect(leads.size).toBe(2);
  });

  it("gives every user at least one open task (no empty Today page)", () => {
    const open = db
      .select()
      .from(tasks)
      .all()
      .filter(t => t.status === "open");
    for (const u of db.select().from(users).all()) {
      expect(
        open.some(t => t.assignedTo === u.id),
        u.name
      ).toBe(true);
    }
  });

  it("uses obviously fictional cause numbers", () => {
    for (const c of allCases.filter(c => c.causeNo)) {
      expect(c.causeNo).toMatch(/^FAKE-/);
    }
  });
});
