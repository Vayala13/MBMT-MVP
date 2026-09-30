import { describe, expect, it } from "vitest";
import { nextBusinessDay, weekendWarning, ymd } from "./dates";

describe("nextBusinessDay", () => {
  it("skips weekends", () => {
    expect(ymd(nextBusinessDay(new Date(2026, 8, 29)))).toBe("2026-09-30"); // Tue → Wed
    expect(ymd(nextBusinessDay(new Date(2026, 9, 2)))).toBe("2026-10-05"); // Fri → Mon
    expect(ymd(nextBusinessDay(new Date(2026, 9, 3)))).toBe("2026-10-05"); // Sat → Mon
  });
});

describe("weekendWarning", () => {
  it("warns on Saturday and Sunday only", () => {
    expect(weekendWarning("2026-10-10")).toMatch(/Saturday/);
    expect(weekendWarning("2026-10-11")).toMatch(/Sunday/);
    expect(weekendWarning("2026-10-12")).toBeNull();
    expect(weekendWarning("")).toBeNull();
  });
});
