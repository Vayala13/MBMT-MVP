import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import type { Db } from "../db/client";
import { activity } from "../db/schema";
import { intQuery } from "../lib/http";

export function activityRouter(db: Db) {
  const r = Router();

  // GET /api/activity?caseId=&limit=50 (read-only; rows are written by every write route)
  r.get("/", (req, res) => {
    const caseId = intQuery(req, "caseId");
    const limit = Math.min(intQuery(req, "limit") ?? 50, 500);
    const rows = db
      .select()
      .from(activity)
      .where(caseId ? eq(activity.caseId, caseId) : undefined)
      .orderBy(desc(activity.createdAt), desc(activity.id))
      .limit(limit)
      .all();
    res.json(rows);
  });

  return r;
}
