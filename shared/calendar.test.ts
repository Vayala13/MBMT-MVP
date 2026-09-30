import { describe, expect, it } from "vitest";
import { calendarDays, shiftAnchor } from "./calendar";
import { ymd } from "./dates";

const tue = new Date(2026, 8, 29); // Tue Sep 29 2026

describe("calendarDays", () => {
  it("1 week = Monday to Sunday around the date", () => {
    const d = calendarDays("week", tue);
    expect(d).toHaveLength(7);
    expect(d[0].date).toBe("2026-09-28");
    expect(d[6].date).toBe("2026-10-04");
  });

  it("3 weeks (default) covers today + 20 days in whole weeks, so the third-week Monday shows", () => {
    const d = calendarDays("3weeks", tue);
    expect(d[0].date).toBe("2026-09-28"); // this week's Monday
    expect(d.at(-1)!.date).toBe("2026-10-25"); // Sunday of the week holding day 21
    expect(d.map(x => x.date)).toContain("2026-10-19"); // Mon, day 21 of the strip
    expect(d).toHaveLength(28);
    // Starting on a Monday it is exactly 3 weeks
    expect(calendarDays("3weeks", new Date(2026, 8, 28))).toHaveLength(21);
  });

  it("month = whole weeks covering the month, days outside it flagged", () => {
    const d = calendarDays("month", tue);
    expect(d[0].date).toBe("2026-08-31"); // Monday before Sep 1
    expect(d.at(-1)!.date).toBe("2026-10-04"); // Sunday after Sep 30
    expect(d.length % 7).toBe(0);
    expect(d.filter(x => x.inRange)).toHaveLength(30);
  });

  it("arrows move by the view length", () => {
    expect(ymd(shiftAnchor("week", tue, -1))).toBe("2026-09-22");
    expect(ymd(shiftAnchor("month", tue, 1))).toBe("2026-10-29");
  });
});
