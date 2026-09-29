import type {
  CallDirection,
  CaseStatus,
  DeadlineKind,
  TaskStatus,
  TemplateSubtask,
  UserRole,
} from "./enums";

/** API response shapes (what the server sends as JSON). */

export type User = {
  id: number;
  name: string;
  role: UserRole;
  initials: string;
};

export type Case = {
  id: number;
  caption: string;
  causeNo: string | null;
  clientName: string;
  caseType: string;
  status: CaseStatus;
  referredTo: string | null;
  leadAttorneyId: number | null;
  openedAt: string;
  lastTouchedAt: string;
  lastTouchedBy: number | null;
};

export type Deadline = {
  id: number;
  caseId: number;
  title: string;
  kind: DeadlineKind;
  dueDate: string;
  sourceNote: string | null;
  assignedTo: number | null;
  doneAt: string | null;
};

export type DeadlineChange = {
  id: number;
  deadlineId: number;
  oldDate: string;
  newDate: string;
  reason: string;
  changedBy: number;
  changedAt: string;
};

export type Task = {
  id: number;
  caseId: number;
  parentTaskId: number | null;
  title: string;
  assignedTo: number | null;
  dueDate: string | null;
  scheduledDate: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  priority: number;
  status: TaskStatus;
  templateId: number | null;
};

export type TaskTemplate = {
  id: number;
  name: string;
  subtasks: TemplateSubtask[];
};

export type Activity = {
  id: number;
  caseId: number | null;
  userId: number;
  action: string;
  detail: string | null;
  createdAt: string;
};

export type CallLog = {
  id: number;
  caseId: number;
  userId: number;
  direction: CallDirection;
  withWhom: string;
  summary: string;
  followUpNeeded: boolean;
  createdAt: string;
};

export type Note = {
  id: number;
  caseId: number;
  taskId: number | null;
  userId: number;
  body: string;
  createdAt: string;
};

/** Header the client sends with the user picked at the gate (no real auth in the MVP). */
export const USER_HEADER = "x-mbmt-user";
