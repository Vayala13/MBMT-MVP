import {
  taskCreateSchema,
  taskFromTemplateSchema,
  taskPatchSchema,
} from "../../shared/schemas";
import { planFromTemplate } from "../../shared/templates";
import { TASK_STATUSES, type TaskStatus } from "../../shared/enums";
import { and, asc, eq, isNull } from "drizzle-orm";
import { Router } from "express";
import type { Db, Tx } from "../db/client";
import { tasks, taskTemplates } from "../db/schema";
import { recordActivity } from "../lib/activity";
import { currentUser } from "../lib/currentUser";
import { HttpError, idParam, intQuery, parseBody, strQuery } from "../lib/http";
import {
  checkUserRef,
  mustGetCase,
  mustGetTask,
  shortDate,
  userName,
} from "../lib/lookups";

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

  // Creating a task from a template makes the parent plus every subtask,
  // each due N days before the parent (weekends → the Friday before).
  r.post("/from-template", (req, res) => {
    const body = parseBody(taskFromTemplateSchema, req.body);
    const user = currentUser(res);
    const created = db.transaction(tx => {
      mustGetCase(tx, body.caseId);
      checkUserRef(tx, body.assignedTo);
      const template = tx
        .select()
        .from(taskTemplates)
        .where(eq(taskTemplates.id, body.templateId))
        .get();
      if (!template)
        throw new HttpError(400, `Template ${body.templateId} not found`);
      const assignedTo = body.assignedTo ?? user.id;
      const priority = body.priority ?? 1;
      const parent = tx
        .insert(tasks)
        .values({
          caseId: body.caseId,
          title: body.title ?? template.name,
          assignedTo,
          dueDate: body.dueDate,
          priority,
          templateId: template.id,
        })
        .returning()
        .get();
      const subtasks = planFromTemplate(template.subtasks, body.dueDate).map(
        s =>
          tx
            .insert(tasks)
            .values({
              caseId: body.caseId,
              parentTaskId: parent.id,
              title: s.title,
              assignedTo,
              dueDate: s.dueDate,
              priority,
              templateId: template.id,
            })
            .returning()
            .get()
      );
      recordActivity(tx, {
        caseId: body.caseId,
        userId: user.id,
        action: "added task from template",
        detail: `${parent.title} · ${subtasks.length} subtasks`,
      });
      return { ...parent, subtasks };
    });
    res.status(201).json(created);
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
      const start =
        body.scheduledStart !== undefined
          ? body.scheduledStart
          : before.scheduledStart;
      const end =
        body.scheduledEnd !== undefined
          ? body.scheduledEnd
          : before.scheduledEnd;
      if (start && end && end <= start) {
        throw new HttpError(400, "A time block must end after it starts");
      }
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

      // One clear activity line per kind of change. Moving a task around your
      // own day planner is personal planning, not case work: no activity, and
      // it doesn't count as touching the case.
      const events: { action: string; detail: string }[] = [];
      if (body.status === "done" && before.status !== "done") {
        events.push({ action: "completed task", detail: before.title });
      } else if (body.status === "open" && before.status === "done") {
        events.push({ action: "reopened task", detail: before.title });
      }
      if (
        body.assignedTo !== undefined &&
        body.assignedTo !== before.assignedTo
      ) {
        events.push({
          action: "reassigned task",
          detail: `${before.title}: ${userName(tx, before.assignedTo)} → ${userName(tx, body.assignedTo)}`,
        });
      }
      if (body.dueDate !== undefined && body.dueDate !== before.dueDate) {
        const d = (x: string | null) => (x ? shortDate(x) : "no date");
        events.push({
          action: "changed task due date",
          detail: `${before.title}: ${d(before.dueDate)} → ${d(body.dueDate ?? null)}`,
        });
      }
      const handled = new Set([
        "status",
        "assignedTo",
        "dueDate",
        "scheduledDate",
        "scheduledStart",
        "scheduledEnd",
      ]);
      const other = (Object.keys(body) as (keyof typeof body)[]).filter(
        k => !handled.has(k) && body[k] !== before[k as keyof typeof before]
      );
      if (other.length) {
        events.push({
          action: "updated task",
          detail: `${before.title} · changed ${other.join(", ")}`,
        });
      }
      for (const e of events) {
        recordActivity(tx, { caseId: before.caseId, userId: user.id, ...e });
      }
      return mustGetTask(tx, id);
    });
    res.json(updated);
  });

  return r;
}
