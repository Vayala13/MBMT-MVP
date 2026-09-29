import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import {
  CALL_DIRECTIONS,
  CASE_STATUSES,
  DEADLINE_KINDS,
  TASK_STATUSES,
  USER_ROLES,
  type TemplateSubtask,
} from "../../shared/enums";

// Conventions:
// - Calendar dates (due dates) are stored as "YYYY-MM-DD" text.
// - Moments in time (created_at, last_touched_at) are ISO-8601 text.
// - Times of day (scheduled blocks) are "HH:MM" text.

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role", { enum: USER_ROLES }).notNull(),
  initials: text("initials").notNull(),
});

export const cases = sqliteTable(
  "cases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caption: text("caption").notNull(),
    causeNo: text("cause_no"),
    clientName: text("client_name").notNull(), // FAKE names only
    caseType: text("case_type").notNull(),
    status: text("status", { enum: CASE_STATUSES }).notNull(),
    referredTo: text("referred_to"),
    leadAttorneyId: integer("lead_attorney_id").references(() => users.id),
    openedAt: text("opened_at").notNull(),
    lastTouchedAt: text("last_touched_at").notNull().default(now),
    lastTouchedBy: integer("last_touched_by").references(() => users.id),
  },
  t => [index("cases_status_idx").on(t.status)]
);

export const deadlines = sqliteTable(
  "deadlines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("case_id")
      .notNull()
      .references(() => cases.id),
    title: text("title").notNull(),
    kind: text("kind", { enum: DEADLINE_KINDS }).notNull(),
    dueDate: text("due_date").notNull(),
    sourceNote: text("source_note"),
    assignedTo: integer("assigned_to").references(() => users.id),
    doneAt: text("done_at"),
  },
  t => [
    index("deadlines_case_idx").on(t.caseId),
    index("deadlines_due_idx").on(t.dueDate),
  ]
);

export const deadlineChanges = sqliteTable("deadline_changes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deadlineId: integer("deadline_id")
    .notNull()
    .references(() => deadlines.id),
  oldDate: text("old_date").notNull(),
  newDate: text("new_date").notNull(),
  reason: text("reason").notNull(),
  changedBy: integer("changed_by")
    .notNull()
    .references(() => users.id),
  changedAt: text("changed_at").notNull().default(now),
});

export const taskTemplates = sqliteTable("task_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  subtasks: text("subtasks", { mode: "json" })
    .$type<TemplateSubtask[]>()
    .notNull(),
});

export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("case_id")
      .notNull()
      .references(() => cases.id),
    parentTaskId: integer("parent_task_id").references(
      (): AnySQLiteColumn => tasks.id
    ),
    title: text("title").notNull(),
    assignedTo: integer("assigned_to").references(() => users.id),
    dueDate: text("due_date"),
    // scheduled_block: date + start/end, all null when unscheduled
    scheduledDate: text("scheduled_date"),
    scheduledStart: text("scheduled_start"),
    scheduledEnd: text("scheduled_end"),
    priority: integer("priority").notNull().default(2),
    status: text("status", { enum: TASK_STATUSES }).notNull().default("open"),
    templateId: integer("template_id").references(() => taskTemplates.id),
  },
  t => [
    index("tasks_case_idx").on(t.caseId),
    index("tasks_parent_idx").on(t.parentTaskId),
    check("tasks_priority_check", sql`${t.priority} between 1 and 3`),
  ]
);

/** Every create/update/complete writes a row here → "who last touched it". */
export const activity = sqliteTable(
  "activity",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("case_id").references(() => cases.id), // null for firm-wide items (templates)
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    detail: text("detail"),
    createdAt: text("created_at").notNull().default(now),
  },
  t => [index("activity_case_idx").on(t.caseId, t.createdAt)]
);

export const callLogs = sqliteTable(
  "call_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("case_id")
      .notNull()
      .references(() => cases.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    direction: text("direction", { enum: CALL_DIRECTIONS }).notNull(),
    withWhom: text("with_whom").notNull(),
    summary: text("summary").notNull(),
    followUpNeeded: integer("follow_up_needed", { mode: "boolean" })
      .notNull()
      .default(false),
    // Typed (or pasted) after the call. Real phone recording/transcription is parked for v2.
    keyPoints: text("key_points", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    actionItems: text("action_items", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    transcript: text("transcript"),
    createdAt: text("created_at").notNull().default(now),
  },
  t => [index("call_logs_case_idx").on(t.caseId)]
);

export const notes = sqliteTable(
  "notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("case_id")
      .notNull()
      .references(() => cases.id),
    taskId: integer("task_id").references(() => tasks.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull().default(now),
  },
  t => [index("notes_case_idx").on(t.caseId)]
);
