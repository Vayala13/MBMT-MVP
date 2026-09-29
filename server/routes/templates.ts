import {
  templateCreateSchema,
  templatePatchSchema,
} from "../../shared/schemas";
import { ensureCiteCheck } from "../../shared/templates";
import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import type { Db, Tx } from "../db/client";
import { tasks, taskTemplates } from "../db/schema";
import { recordActivity } from "../lib/activity";
import { currentUser } from "../lib/currentUser";
import { HttpError, idParam, parseBody } from "../lib/http";

function mustGetTemplate(db: Db | Tx, id: number) {
  const row = db
    .select()
    .from(taskTemplates)
    .where(eq(taskTemplates.id, id))
    .get();
  if (!row) throw new HttpError(404, `Template ${id} not found`);
  return row;
}

/** Firm policy lives on the server so no client can skip it. */
function withCiteCheck<
  T extends { subtasks?: { title: string; offset_days_before_due: number }[] },
>(body: T): { body: T; citeCheckAdded: boolean } {
  if (!body.subtasks) return { body, citeCheckAdded: false };
  const { subtasks, added } = ensureCiteCheck(body.subtasks);
  return { body: { ...body, subtasks }, citeCheckAdded: added };
}

export function templatesRouter(db: Db) {
  const r = Router();

  r.get("/", (_req, res) => {
    res.json(
      db.select().from(taskTemplates).orderBy(asc(taskTemplates.name)).all()
    );
  });

  r.get("/:id", (req, res) => {
    res.json(mustGetTemplate(db, idParam(req)));
  });

  // Templates are firm-wide, so their activity rows have no case.
  r.post("/", (req, res) => {
    const { body, citeCheckAdded } = withCiteCheck(
      parseBody(templateCreateSchema, req.body)
    );
    const user = currentUser(res);
    const created = db.transaction(tx => {
      const row = tx.insert(taskTemplates).values(body).returning().get();
      recordActivity(tx, {
        caseId: null,
        userId: user.id,
        action: "created template",
        detail: row.name,
      });
      return row;
    });
    res.status(201).json({ ...created, citeCheckAdded });
  });

  r.patch("/:id", (req, res) => {
    const id = idParam(req);
    const { body, citeCheckAdded } = withCiteCheck(
      parseBody(templatePatchSchema, req.body)
    );
    const user = currentUser(res);
    const updated = db.transaction(tx => {
      const before = mustGetTemplate(tx, id);
      if (!Object.keys(body).length) return before;
      const row = tx
        .update(taskTemplates)
        .set(body)
        .where(eq(taskTemplates.id, id))
        .returning()
        .get();
      recordActivity(tx, {
        caseId: null,
        userId: user.id,
        action: "updated template",
        detail: row.name,
      });
      return row;
    });
    res.json({ ...updated, citeCheckAdded });
  });

  // Tasks already made from it keep their subtasks; they just lose the link.
  r.delete("/:id", (req, res) => {
    const id = idParam(req);
    const user = currentUser(res);
    db.transaction(tx => {
      const before = mustGetTemplate(tx, id);
      tx.update(tasks)
        .set({ templateId: null })
        .where(eq(tasks.templateId, id))
        .run();
      tx.delete(taskTemplates).where(eq(taskTemplates.id, id)).run();
      recordActivity(tx, {
        caseId: null,
        userId: user.id,
        action: "deleted template",
        detail: before.name,
      });
    });
    res.status(204).end();
  });

  return r;
}
