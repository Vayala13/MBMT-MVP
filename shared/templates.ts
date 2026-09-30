import { getDay, subDays } from "date-fns";
import { ymd } from "./dates";
import type { TemplateSubtask } from "./enums";
import { toDate } from "./dashboard";

/**
 * Template math. Subtask due = parent due − offset days. A subtask that
 * lands on a weekend moves to the Friday before (decided: earlier is safer,
 * work is never due after the filing). Staff can edit any date afterwards.
 */

/** Saturday/Sunday → the Friday before; weekdays unchanged. */
export function fridayIfWeekend(d: Date): Date {
  const wd = getDay(d);
  if (wd === 6) return subDays(d, 1);
  if (wd === 0) return subDays(d, 2);
  return d;
}

export function subtaskDueDate(
  parentDue: string,
  offsetDaysBefore: number
): string {
  return ymd(fridayIfWeekend(subDays(toDate(parentDue), offsetDaysBefore)));
}

export type PlannedSubtask = { title: string; dueDate: string; offset: number };

/** Subtasks with real dates, in due-date order (ties keep template order). */
export function planFromTemplate(
  subtasks: TemplateSubtask[],
  parentDue: string
): PlannedSubtask[] {
  return subtasks
    .map((s, i) => ({
      i,
      title: s.title,
      offset: s.offset_days_before_due,
      dueDate: subtaskDueDate(parentDue, s.offset_days_before_due),
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.i - b.i)
    .map(({ title, dueDate, offset }) => ({ title, dueDate, offset }));
}

// ---- Firm policy: nothing reaches an attorney without a cite-check.

export const CITE_CHECK_TITLE = "Cite-check every authority";
const DRAFTING = /\bdraft/i;
const CITE_CHECK = /cite[\s-]?check/i;

export const isDraftingTemplate = (subtasks: TemplateSubtask[]) =>
  subtasks.some(s => DRAFTING.test(s.title));

export const hasCiteCheck = (subtasks: TemplateSubtask[]) =>
  subtasks.some(s => CITE_CHECK.test(s.title));

/**
 * Drafting templates always get a cite-check. If one is missing, add it right
 * after the last drafting step, 2 days after that draft (never after the due date).
 */
export function ensureCiteCheck(subtasks: TemplateSubtask[]): {
  subtasks: TemplateSubtask[];
  added: boolean;
} {
  if (!isDraftingTemplate(subtasks) || hasCiteCheck(subtasks)) {
    return { subtasks, added: false };
  }
  const lastDraft = subtasks.map(s => DRAFTING.test(s.title)).lastIndexOf(true);
  const offset = Math.max(0, subtasks[lastDraft].offset_days_before_due - 2);
  const next = [...subtasks];
  next.splice(lastDraft + 1, 0, {
    title: CITE_CHECK_TITLE,
    offset_days_before_due: offset,
  });
  return { subtasks: next, added: true };
}
