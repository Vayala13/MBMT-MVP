import { eq } from "drizzle-orm";
import type { Db, Tx } from "../db/client";
import { cases, deadlines, tasks, users } from "../db/schema";
import { HttpError } from "./http";

export function mustGetCase(db: Db | Tx, id: number) {
  const row = db.select().from(cases).where(eq(cases.id, id)).get();
  if (!row) throw new HttpError(404, `Case ${id} not found`);
  return row;
}

export function mustGetDeadline(db: Db | Tx, id: number) {
  const row = db.select().from(deadlines).where(eq(deadlines.id, id)).get();
  if (!row) throw new HttpError(404, `Deadline ${id} not found`);
  return row;
}

export function mustGetTask(db: Db | Tx, id: number) {
  const row = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!row) throw new HttpError(404, `Task ${id} not found`);
  return row;
}

/** Validates an optional user reference (assignee, lead attorney). */
export function checkUserRef(db: Db | Tx, id: number | null | undefined) {
  if (id == null) return;
  const row = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .get();
  if (!row) throw new HttpError(400, `User ${id} not found`);
}

/** "2026-10-02" → "10/2" for activity text. */
export function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** Display name for activity text ("unassigned" for null). */
export function userName(db: Db | Tx, id: number | null | undefined): string {
  if (id == null) return "unassigned";
  return (
    db.select({ name: users.name }).from(users).where(eq(users.id, id)).get()
      ?.name ?? `user ${id}`
  );
}
