import { eq } from "drizzle-orm";
import type { Db, Tx } from "../db/client";
import { activity, cases } from "../db/schema";

/**
 * Every write calls this: it logs an activity row and, for case-linked
 * writes, stamps cases.last_touched_at / last_touched_by.
 */
export function recordActivity(
  db: Db | Tx,
  entry: {
    caseId: number | null;
    userId: number;
    action: string;
    detail?: string;
  }
) {
  const at = new Date().toISOString();
  db.insert(activity)
    .values({
      caseId: entry.caseId,
      userId: entry.userId,
      action: entry.action,
      detail: entry.detail ?? null,
      createdAt: at,
    })
    .run();
  if (entry.caseId !== null) {
    db.update(cases)
      .set({ lastTouchedAt: at, lastTouchedBy: entry.userId })
      .where(eq(cases.id, entry.caseId))
      .run();
  }
}
