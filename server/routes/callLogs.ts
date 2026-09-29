import { callLogCreateSchema, callLogPatchSchema } from "../../shared/schemas";
import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { nextBusinessDay, ymd } from "../../shared/dates";
import type { Db } from "../db/client";
import { callLogs, tasks } from "../db/schema";
import { recordActivity } from "../lib/activity";
import { currentUser } from "../lib/currentUser";
import { HttpError, idParam, intQuery, parseBody } from "../lib/http";
import { mustGetCase } from "../lib/lookups";

export function callLogsRouter(db: Db) {
  const r = Router();

  // GET /api/call-logs?caseId=
  r.get("/", (req, res) => {
    const caseId = intQuery(req, "caseId");
    const rows = db
      .select()
      .from(callLogs)
      .where(caseId ? eq(callLogs.caseId, caseId) : undefined)
      .orderBy(desc(callLogs.createdAt))
      .all();
    res.json(rows);
  });

  r.post("/", (req, res) => {
    const body = parseBody(callLogCreateSchema, req.body);
    const user = currentUser(res);
    const created = db.transaction(tx => {
      mustGetCase(tx, body.caseId);
      const row = tx
        .insert(callLogs)
        .values({
          ...body,
          userId: user.id,
          createdAt: new Date().toISOString(),
        })
        .returning()
        .get();
      // Follow-up checked → a task for the caller, due the next business day.
      let followUpTaskId: number | null = null;
      if (row.followUpNeeded) {
        const title = `Follow up: call with ${row.withWhom}`;
        followUpTaskId = tx
          .insert(tasks)
          .values({
            caseId: row.caseId,
            title,
            assignedTo: user.id,
            dueDate: ymd(nextBusinessDay(new Date())),
            priority: 1,
          })
          .returning({ id: tasks.id })
          .get().id;
        recordActivity(tx, {
          caseId: row.caseId,
          userId: user.id,
          action: "added task",
          detail: title,
        });
      }
      // Logged last so the case reads "Last touched by … · logged call".
      recordActivity(tx, {
        caseId: row.caseId,
        userId: user.id,
        action: "logged call",
        detail: `${row.direction === "in" ? "Call from" : "Call to"} ${row.withWhom}${row.followUpNeeded ? " · follow-up needed" : ""}`,
      });
      return { ...row, followUpTaskId };
    });
    res.status(201).json(created);
  });

  r.patch("/:id", (req, res) => {
    const id = idParam(req);
    const body = parseBody(callLogPatchSchema, req.body);
    const user = currentUser(res);
    const updated = db.transaction(tx => {
      const before = tx
        .select()
        .from(callLogs)
        .where(eq(callLogs.id, id))
        .get();
      if (!before) throw new HttpError(404, `Call log ${id} not found`);
      if (!Object.keys(body).length) return before;
      const row = tx
        .update(callLogs)
        .set(body)
        .where(eq(callLogs.id, id))
        .returning()
        .get();
      recordActivity(tx, {
        caseId: before.caseId,
        userId: user.id,
        action: "updated call log",
        detail: `Call with ${row.withWhom}`,
      });
      return row;
    });
    res.json(updated);
  });

  return r;
}
