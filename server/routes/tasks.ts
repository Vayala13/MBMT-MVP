import { taskCreateSchema, taskPatchSchema } from "../../shared/schemas";
import { TASK_STATUSES, type TaskStatus } from "../../shared/enums";
import { and, asc, eq, isNull } from "drizzle-orm";
import { Router } from "express";
import type { Db, Tx } from "../db/client";
import { tasks, taskTemplates } from "../db/schema";
import { recordActivity } from "../lib/activity";
import { currentUser } from "../lib/currentUser";
import { HttpError, idParam, intQuery, parseBody, strQuery } from "../lib/http";
import { checkUserRef, mustGetCase, mustGetTask } from "../lib/lookups";

function checkTemplateRef(tx: Tx, id: number | null | undefined) {
  if (id == null) return;
  const row = tx
    .select({ id: taskTemplates.id })
    .from(taskTemplates)
    .where(eq(taskTemplates.id, id))
    .get();
  if (!row) throw new HttpError(400, `Template ${id} not found`);
}

export function tasksRouter(db: Db) {
  const r = Router();

  // GET /api/tasks?caseId=&assignedTo=&status=open&topLevel=true
  r.get("/", (req, res) => {
    const caseId = intQuery(req, "caseId");
    const assignedTo = intQuery(req, "assignedTo");
    const status = strQuery(req, "status");
    if (status && !(TASK_STATUSES as readonly string[]).includes(status)) {
      throw new HttpError(400, "Bad status");
    }
    const topLevel = strQuery(req, "topLevel") === "true";
    const rows = db
      .select()
      .from(tasks)
      .where(
        and(
          caseId ? eq(tasks.caseId, caseId) : undefined,
          assignedTo ? eq(tasks.assignedTo, assignedTo) : undefined,
          status ? eq(tasks.status, status as TaskStatus) : undefined,
          topLevel ? isNull(tasks.parentTaskId) : undefined
        )
      )
      .orderBy(asc(tasks.dueDate), asc(tasks.priority))
      .all();
    res.json(rows);
  });

  // Includes subtasks
  r.get("/:id", (req, res) => {
    const t = mustGetTask(db, idParam(req));
    const subtasks = db
      .select()
      .from(tasks)
      .where(eq(tasks.parentTaskId, t.id))
      .orderBy(asc(tasks.dueDate))
      .all();
    res.json({ ...t, subtasks });
  });

  r.post("/", (req, res) => {
    const body = parseBody(taskCreateSchema, req.body);
    const user = currentUser(res);
    const created = db.transaction(tx => {
      mustGetCase(tx, body.caseId);
      checkUserRef(tx, body.assignedTo);
      checkTemplateRef(tx, body.templateId);
      if (body.parentTaskId != null) {
        const parent = mustGetTask(tx, body.parentTaskId);
        if (parent.caseId !== body.caseId) {
          throw new HttpError(
            400,
            "A subtask must belong to its parent's case"
          );
        }
      }
      const row = tx.insert(tasks).values(body).returning().get();
      recordActivity(tx, {
        caseId: row.caseId,
        userId: user.id,
        action: row.parentTaskId ? "added subtask" : "added task",
        detail: row.title,
      });
      return row;
    });
    res.status(201).json(created);
  });

  r.patch("/:id", (req, res) => {
    const id = idParam(req);
    const body = parseBody(taskPatchSchema, req.body);
    const user = currentUser(res);
    const updated = db.transaction(tx => {
      const before = mustGetTask(tx, id);
      if (!Object.keys(body).length) return before;
      checkUserRef(tx, body.assignedTo);
      checkTemplateRef(tx, body.templateId);
      if (body.parentTaskId === id)
        throw new HttpError(400, "A task cannot be its own parent");
      if (body.parentTaskId != null) {
        const parent = mustGetTask(tx, body.parentTaskId);
        if (parent.caseId !== before.caseId) {
          throw new HttpError(
            400,
            "A subtask must belong to its parent's case"
          );
        }
      }
      tx.update(tasks).set(body).where(eq(tasks.id, id)).run();
      const action =
        body.status === "done" && before.status !== "done"
          ? "completed task"
          : body.status === "open" && before.status === "done"
            ? "reopened task"
            : "updated task";
      const detail =
        action === "updated task"
          ? `${before.title} · changed ${Object.keys(body).join(", ")}`
          : before.title;
      recordActivity(tx, {
        caseId: before.caseId,
        userId: user.id,
        action,
        detail,
      });
      return mustGetTask(tx, id);
    });
    res.json(updated);
  });

  return r;
}
