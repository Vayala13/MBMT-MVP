import {
  deadlineCreateSchema,
  deadlinePatchSchema,
} from "../../shared/schemas";
import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import { Router } from "express";
import type { Db } from "../db/client";
import { deadlineChanges, deadlines } from "../db/schema";
import { recordActivity } from "../lib/activity";
import { currentUser } from "../lib/currentUser";
import { HttpError, idParam, intQuery, parseBody, strQuery } from "../lib/http";
import {
  checkUserRef,
  mustGetCase,
  mustGetDeadline,
  shortDate,
} from "../lib/lookups";

export function deadlinesRouter(db: Db) {
  const r = Router();

  // GET /api/deadlines?caseId=&from=YYYY-MM-DD&to=YYYY-MM-DD&open=true
  r.get("/", (req, res) => {
    const caseId = intQuery(req, "caseId");
    const from = strQuery(req, "from");
    const to = strQuery(req, "to");
    const openOnly = strQuery(req, "open") === "true";
    const rows = db
      .select()
      .from(deadlines)
      .where(
        and(
          caseId ? eq(deadlines.caseId, caseId) : undefined,
          from ? gte(deadlines.dueDate, from) : undefined,
          to ? lte(deadlines.dueDate, to) : undefined,
          openOnly ? isNull(deadlines.doneAt) : undefined
        )
      )
      .orderBy(asc(deadlines.dueDate))
      .all();
    res.json(rows);
  });

  // Includes the change history ("moved from 10/2 → 10/16 · Rule 11 agreement")
  r.get("/:id", (req, res) => {
    const d = mustGetDeadline(db, idParam(req));
    const changes = db
      .select()
      .from(deadlineChanges)
      .where(eq(deadlineChanges.deadlineId, d.id))
      .orderBy(asc(deadlineChanges.changedAt))
      .all();
    res.json({ ...d, changes });
  });

  r.post("/", (req, res) => {
    const body = parseBody(deadlineCreateSchema, req.body);
    const user = currentUser(res);
    const created = db.transaction(tx => {
      mustGetCase(tx, body.caseId);
      checkUserRef(tx, body.assignedTo);
      const row = tx.insert(deadlines).values(body).returning().get();
      recordActivity(tx, {
        caseId: row.caseId,
        userId: user.id,
        action: "added deadline",
        detail: `${row.title} · due ${shortDate(row.dueDate)}`,
      });
      return row;
    });
    res.status(201).json(created);
  });

  r.patch("/:id", (req, res) => {
    const id = idParam(req);
    const { done, changeReason, ...fields } = parseBody(
      deadlinePatchSchema,
      req.body
    );
    const user = currentUser(res);
    const updated = db.transaction(tx => {
      const before = mustGetDeadline(tx, id);
      checkUserRef(tx, fields.assignedTo);
      const dateMoved =
        fields.dueDate !== undefined && fields.dueDate !== before.dueDate;
      if (dateMoved && !changeReason) {
        throw new HttpError(
          400,
          "A reason is required to change a deadline date"
        );
      }

      const set: Partial<typeof deadlines.$inferInsert> = { ...fields };
      if (done === true && !before.doneAt)
        set.doneAt = new Date().toISOString();
      if (done === false) set.doneAt = null;
      if (Object.keys(set).length) {
        tx.update(deadlines).set(set).where(eq(deadlines.id, id)).run();
      }

      if (dateMoved) {
        tx.insert(deadlineChanges)
          .values({
            deadlineId: id,
            oldDate: before.dueDate,
            newDate: fields.dueDate!,
            reason: changeReason!,
            changedBy: user.id,
          })
          .run();
        recordActivity(tx, {
          caseId: before.caseId,
          userId: user.id,
          action: "moved deadline",
          detail: `${before.title}: ${shortDate(before.dueDate)} → ${shortDate(fields.dueDate!)} · ${changeReason}`,
        });
      }
      if (done === true && !before.doneAt) {
        recordActivity(tx, {
          caseId: before.caseId,
          userId: user.id,
          action: "completed deadline",
          detail: before.title,
        });
      } else if (done === false && before.doneAt) {
        recordActivity(tx, {
          caseId: before.caseId,
          userId: user.id,
          action: "reopened deadline",
          detail: before.title,
        });
      }
      const otherFields = Object.keys(fields).filter(k => k !== "dueDate");
      if (otherFields.length) {
        recordActivity(tx, {
          caseId: before.caseId,
          userId: user.id,
          action: "updated deadline",
          detail: `${before.title} · changed ${otherFields.join(", ")}`,
        });
      }
      return mustGetDeadline(tx, id);
    });
    res.json(updated);
  });

  return r;
}
