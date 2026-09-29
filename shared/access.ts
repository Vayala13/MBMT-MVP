import type { UserRole } from "./enums";

/**
 * PROPOSED access matrix for the pilot. Read-only in the app and NOT
 * enforced by the prototype: every user can do everything. Confirm with
 * Jesse (IT) and Tomas before real sign-in is built.
 */
export type Access = "yes" | "no" | "limited";

export type Permission = {
  id: string;
  label: string;
  description: string;
  roles: Record<UserRole, Access>;
  /** Shown when a role is "limited". */
  limits?: Partial<Record<UserRole, string>>;
};

export const PROPOSED_PERMISSIONS: Permission[] = [
  {
    id: "view",
    label: "View cases",
    description: "Open case pages, deadlines, tasks, calls and notes",
    roles: {
      attorney: "yes",
      paralegal: "yes",
      file_clerk: "yes",
      admin: "limited",
    },
    limits: { admin: "Only to fix a problem, when asked (privilege)" },
  },
  {
    id: "edit_deadlines",
    label: "Edit deadlines",
    description: "Add deadlines, move dates (with a reason), reassign",
    roles: {
      attorney: "yes",
      paralegal: "yes",
      file_clerk: "limited",
      admin: "no",
    },
    limits: {
      file_clerk: "Add and reassign; date moves need a paralegal or attorney",
    },
  },
  {
    id: "delete",
    label: "Delete",
    description: "Delete templates or records permanently",
    roles: { attorney: "yes", paralegal: "no", file_clerk: "no", admin: "no" },
  },
  {
    id: "templates",
    label: "Manage templates",
    description: "Create and edit task templates",
    roles: { attorney: "yes", paralegal: "yes", file_clerk: "no", admin: "no" },
  },
  {
    id: "admin",
    label: "Admin",
    description: "Add or remove users, change access, backups",
    roles: {
      attorney: "limited",
      paralegal: "no",
      file_clerk: "no",
      admin: "yes",
    },
    limits: { attorney: "Approves changes; IT carries them out" },
  },
];
