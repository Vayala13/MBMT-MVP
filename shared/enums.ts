/** Value lists shared by the DB schema, zod schemas and the client. */

export const USER_ROLES = [
  "attorney",
  "paralegal",
  "file_clerk",
  "admin",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  attorney: "Attorney",
  paralegal: "Paralegal",
  file_clerk: "File clerk",
  admin: "IT admin",
};

export const CASE_STATUSES = [
  "inquiry",
  "consult",
  "active",
  "referred_out",
  "closed",
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const DEADLINE_KINDS = [
  "court_ordered",
  "statutory",
  "internal",
  "rule_11",
] as const;
export type DeadlineKind = (typeof DEADLINE_KINDS)[number];

/** Reasons offered when a deadline date moves (free text allowed after "Other"). */
export const DEADLINE_CHANGE_REASONS = [
  "Rule 11 agreement",
  "Court order",
  "Other",
] as const;

export const TASK_STATUSES = ["open", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const CALL_DIRECTIONS = ["in", "out"] as const;
export type CallDirection = (typeof CALL_DIRECTIONS)[number];

export type TemplateSubtask = { title: string; offset_days_before_due: number };
