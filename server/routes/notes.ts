import { noteCreateSchema, notePatchSchema } from "../../shared/schemas";
import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import type { Db } from "../db/client";
import { notes } from "../db/schema";
import { recordActivity } from "../lib/activity";
import { currentUser } from "../lib/currentUser";
import { HttpError, idParam, intQuery, parseBody } from "../lib/http";
import { mustGetCase, mustGetTask } from "../lib/lookups";

const preview = (body: string) =>
  body.length > 60 ? `${body.slice(0, 57)}…` : body;

export function notesRouter(db: Db) {
  const r = Router();

  // GET /api/notes?caseId=&taskId=
  r.get("/", (req, res) => {
    const caseId = intQuery(req, "caseId");
    const taskId = intQuery(req, "taskId");
    const rows = db
      .select()
      .from(notes)
      .where(
        and(
          caseId ? eq(notes.caseId, caseId) : undefined,
          taskId ? eq(notes.taskId, taskId) : undefined
        )
      )
      .orderBy(desc(notes.createdAt))
      .all();
    res.json(rows);
  });

  r.post("/", (req, res) => {
    const body = parseBody(noteCreateSchema, req.body);
    const user = currentUser(res);
    const created = db.transaction(tx => {
      mustGetCase(tx, body.caseId);
      if (
        body.taskId != null &&
        mustGetTask(tx, body.taskId).caseId !== body.caseId
      ) {
        throw new HttpError(400, "That task belongs to a different case");
      }
      const row = tx
        .insert(notes)
        .values({
          ...body,
          userId: user.id,
          createdAt: new Date().toISOString(),
        })
        .returning()
        .get();
      recordActivity(tx, {
        caseId: row.caseId,
        userId: user.id,
        action: "added note",
        detail: preview(row.body),
      });
      return row;
    });
    res.status(201).json(created);
  });

  r.patch("/:id", (req, res) => {
    const id = idParam(req);
    const body = parseBody(notePatchSchema, req.body);
    const user = currentUser(res);
    const updated = db.transaction(tx => {
      const before = tx.select().from(notes).where(eq(notes.id, id)).get();
      if (!before) throw new HttpError(404, `Note ${id} not found`);
      const row = tx
        .update(notes)
        .set(body)
        .where(eq(notes.id, id))
        .returning()
        .get();
      recordActivity(tx, {
        caseId: before.caseId,
        userId: user.id,
        action: "edited note",
        detail: preview(row.body),
      });
      return row;
    });
    res.json(updated);
  });

  return r;
}
