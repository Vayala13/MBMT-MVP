import { describe, expect, it } from "vitest";
import { deadlineStatus, isStale, relativeDueLabel } from "./status";

const today = new Date(2026, 8, 28); // Mon Sep 28 2026
const plus = (n: number) => new Date(2026, 8, 28 + n);

describe("deadlineStatus", () => {
  it("is overdue before today", () => {
    expect(deadlineStatus(plus(-1), today)).toBe("overdue");
  });
  it("is soon from today through day 7", () => {
    expect(deadlineStatus(plus(0), today)).toBe("soon");
    expect(deadlineStatus(plus(7), today)).toBe("soon");
  });
  it("is ok from day 8 on (incl. the third-week Monday)", () => {
    expect(deadlineStatus(plus(8), today)).toBe("ok");
    expect(deadlineStatus(plus(21), today)).toBe("ok");
  });
  it("ignores time of day", () => {
    const lateToday = new Date(2026, 8, 28, 23, 59);
    expect(deadlineStatus(lateToday, new Date(2026, 8, 28, 0, 1))).toBe("soon");
  });
});

describe("isStale", () => {
  it("is stale only after 365 days", () => {
    expect(isStale(plus(-365), today)).toBe(false);
    expect(isStale(plus(-366), today)).toBe(true);
  });
});

describe("relativeDueLabel", () => {
  it("reads naturally", () => {
    expect(relativeDueLabel(plus(0), today)).toBe("today");
    expect(relativeDueLabel(plus(1), today)).toBe("tomorrow");
    expect(relativeDueLabel(plus(10), today)).toBe("in 10 days");
    expect(relativeDueLabel(plus(-1), today)).toBe("1 day overdue");
    expect(relativeDueLabel(plus(-4), today)).toBe("4 days overdue");
  });
});
