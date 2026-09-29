import { z } from "zod";
import {
  CALL_DIRECTIONS,
  CASE_STATUSES,
  DEADLINE_KINDS,
  TASK_STATUSES,
} from "./enums";

/** Request-body validation shared by client forms and server routes. */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
const id = z.number().int().positive();
const text = z.string().trim().min(1, "Required");

// ---- Cases
export const caseCreateSchema = z.object({
  caption: text,
  causeNo: z.string().trim().nullish(),
  clientName: text,
  caseType: text,
  status: z.enum(CASE_STATUSES),
  referredTo: z.string().trim().nullish(),
  leadAttorneyId: id.nullish(),
  openedAt: isoDate.optional(),
});
export const casePatchSchema = caseCreateSchema.partial();

// ---- Deadlines
export const deadlineCreateSchema = z.object({
  caseId: id,
  title: text,
  kind: z.enum(DEADLINE_KINDS),
  dueDate: isoDate,
  sourceNote: z.string().trim().nullish(),
  assignedTo: id.nullish(),
});
export const deadlinePatchSchema = deadlineCreateSchema
  .omit({ caseId: true })
  .partial()
  .extend({
    done: z.boolean().optional(),
    /** Required whenever dueDate changes; written to deadline_changes. */
    changeReason: text.optional(),
  });

// ---- Tasks
const taskFields = z.object({
  caseId: id,
  parentTaskId: id.nullish(),
  title: text,
  assignedTo: id.nullish(),
  dueDate: isoDate.nullish(),
  scheduledDate: isoDate.nullish(),
  scheduledStart: clockTime.nullish(),
  scheduledEnd: clockTime.nullish(),
  priority: z.number().int().min(1).max(3).optional(),
  templateId: id.nullish(),
});
export const taskCreateSchema = taskFields;
export const taskPatchSchema = taskFields
  .omit({ caseId: true })
  .partial()
  .extend({ status: z.enum(TASK_STATUSES).optional() });

// ---- Call logs
/** One entry per line: key points, action items. */
const lines = z.array(z.string().trim().min(1)).max(20);

const callLogFields = z.object({
  caseId: id,
  direction: z.enum(CALL_DIRECTIONS),
  withWhom: text,
  summary: text,
  followUpNeeded: z.boolean(),
  keyPoints: lines,
  actionItems: lines,
  transcript: z.string().trim().max(50_000).nullish(),
});
export const callLogCreateSchema = callLogFields.extend({
  followUpNeeded: z.boolean().default(false),
  keyPoints: lines.default([]),
  actionItems: lines.default([]),
  /** Create one task per action item (assigned to the caller). */
  actionItemsToTasks: z.boolean().default(true),
});
export const callLogPatchSchema = callLogFields
  .omit({ caseId: true })
  .partial();

// ---- Notes
export const noteCreateSchema = z.object({
  caseId: id,
  taskId: id.nullish(),
  body: text,
});
export const notePatchSchema = z.object({ body: text });

// ---- Task templates
export const templateSubtaskSchema = z.object({
  title: text,
  offset_days_before_due: z.number().int().min(0),
});
export const templateCreateSchema = z.object({
  name: text,
  subtasks: z.array(templateSubtaskSchema),
});
export const templatePatchSchema = templateCreateSchema.partial();

export type CaseCreate = z.infer<typeof caseCreateSchema>;
export type DeadlineCreate = z.infer<typeof deadlineCreateSchema>;
export type DeadlinePatch = z.infer<typeof deadlinePatchSchema>;
export type TaskCreate = z.infer<typeof taskCreateSchema>;
export type CallLogCreate = z.infer<typeof callLogCreateSchema>;
export type NoteCreate = z.infer<typeof noteCreateSchema>;
export type TemplateCreate = z.infer<typeof templateCreateSchema>;
