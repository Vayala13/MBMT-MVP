import { describe, expect, it } from "vitest";
import { AA_TEXT, contrastRatio } from "./contrast";
import { TEXT_ON_SURFACE } from "./tokens";

describe("contrastRatio", () => {
  it("matches the WCAG extremes", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });
});

describe("design system text colors", () => {
  for (const t of TEXT_ON_SURFACE.text) {
    for (const s of TEXT_ON_SURFACE.surfaces) {
      it(`${t.name} on ${s.name} passes AA`, () => {
        expect(contrastRatio(t.hex, s.hex)).toBeGreaterThanOrEqual(AA_TEXT);
      });
    }
  }
  it("plaster on navy (sidebar) passes AA", () => {
    expect(contrastRatio("#f8f6f2", "#1f2a3c")).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio("#d9d6c6", "#1f2a3c")).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
