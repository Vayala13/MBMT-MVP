import type { Case } from "@shared/types";
import { describe, expect, it } from "vitest";
import { matchCases } from "./CaseSearch";

const c = (id: number, caption: string, extra: Partial<Case> = {}): Case => ({
  id,
  caption,
  causeNo: `FAKE-24-CV-0${id}`,
  clientName: `Client ${id}`,
  caseType: "Breach of contract",
  status: "active",
  referredTo: null,
  leadAttorneyId: null,
  openedAt: "2025-01-01",
  lastTouchedAt: `2026-09-${String(10 + id).padStart(2, "0")}T10:00:00Z`,
  lastTouchedBy: null,
  ...extra,
});
const cases = [
  c(1, "Pemberton v. Hollow Oak Supply Co.", {
    clientName: "Marigold Pemberton",
  }),
  c(2, "Quillfeather v. Bramblewood Transit LLC", {
    caseType: "Personal injury – auto",
  }),
  c(3, "Grimsby v. Starling Medical Supply"),
];

describe("matchCases (/ search)", () => {
  it("matches caption, client, cause no. and type; every word must match", () => {
    expect(matchCases(cases, "supply").map(x => x.id)).toEqual([3, 1]); // most recently touched first
    expect(matchCases(cases, "marigold").map(x => x.id)).toEqual([1]);
    expect(matchCases(cases, "cv-02").map(x => x.id)).toEqual([2]);
    expect(matchCases(cases, "injury quill").map(x => x.id)).toEqual([2]);
    expect(matchCases(cases, "injury pemberton")).toEqual([]);
  });

  it("shows recent cases before you type", () => {
    expect(matchCases(cases, "  ").map(x => x.id)).toEqual([3, 2, 1]);
  });
});
