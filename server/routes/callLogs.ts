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
    const { actionItemsToTasks, ...body } = parseBody(
      callLogCreateSchema,
      req.body
    );
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
      // Tasks created from the call go to the caller, due the next business day.
      const due = ymd(nextBusinessDay(new Date()));
      const addTask = (title: string, priority: number) => {
        const taskId = tx
          .insert(tasks)
          .values({
            caseId: row.caseId,
            title,
            assignedTo: user.id,
            dueDate: due,
            priority,
          })
          .returning({ id: tasks.id })
          .get().id;
        recordActivity(tx, {
          caseId: row.caseId,
          userId: user.id,
          action: "added task",
          detail: title,
        });
        return taskId;
      };
      const followUpTaskId = row.followUpNeeded
        ? addTask(`Follow up: call with ${row.withWhom}`, 1)
        : null;
      const actionItemTaskIds = actionItemsToTasks
        ? row.actionItems.map(item => addTask(item, 2))
        : [];
      // Logged last so the case reads "Last touched by … · logged call".
      recordActivity(tx, {
        caseId: row.caseId,
        userId: user.id,
        action: "logged call",
        detail: [
          `${row.direction === "in" ? "Call from" : "Call to"} ${row.withWhom}`,
          row.followUpNeeded ? "follow-up needed" : "",
          row.actionItems.length
            ? `${row.actionItems.length} action item${row.actionItems.length === 1 ? "" : "s"}`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      });
      return { ...row, followUpTaskId, actionItemTaskIds };
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
