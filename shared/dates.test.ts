import { describe, expect, it } from "vitest";
import { nextBusinessDay, ymd } from "./dates";

describe("nextBusinessDay", () => {
  it("skips weekends", () => {
    expect(ymd(nextBusinessDay(new Date(2026, 8, 29)))).toBe("2026-09-30"); // Tue → Wed
    expect(ymd(nextBusinessDay(new Date(2026, 9, 2)))).toBe("2026-10-05"); // Fri → Mon
    expect(ymd(nextBusinessDay(new Date(2026, 9, 3)))).toBe("2026-10-05"); // Sat → Mon
  });
});
