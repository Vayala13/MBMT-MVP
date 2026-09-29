import { caseCreateSchema, casePatchSchema } from "../../shared/schemas";
import { desc, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import type { Db } from "../db/client";
import { cases } from "../db/schema";
import { recordActivity } from "../lib/activity";
import { currentUser } from "../lib/currentUser";
import { idParam, parseBody, strQuery } from "../lib/http";
import { checkUserRef, mustGetCase } from "../lib/lookups";
import { CASE_STATUSES, type CaseStatus } from "../../shared/enums";

export function casesRouter(db: Db) {
  const r = Router();

  // GET /api/cases?status=active,consult
  r.get("/", (req, res) => {
    const statuses = strQuery(req, "status")
      ?.split(",")
      .filter((s): s is CaseStatus =>
        (CASE_STATUSES as readonly string[]).includes(s)
      );
    const rows = db
      .select()
      .from(cases)
      .where(statuses?.length ? inArray(cases.status, statuses) : undefined)
      .orderBy(desc(cases.lastTouchedAt))
      .all();
    res.json(rows);
  });

  r.get("/:id", (req, res) => {
    res.json(mustGetCase(db, idParam(req)));
  });

  r.post("/", (req, res) => {
    const body = parseBody(caseCreateSchema, req.body);
    const user = currentUser(res);
    const created = db.transaction(tx => {
      checkUserRef(tx, body.leadAttorneyId);
      const row = tx
        .insert(cases)
        .values({
          ...body,
          openedAt: body.openedAt ?? new Date().toISOString().slice(0, 10),
        })
        .returning()
        .get();
      recordActivity(tx, {
        caseId: row.id,
        userId: user.id,
        action: "opened case",
        detail: row.caption,
      });
      return mustGetCase(tx, row.id);
    });
    res.status(201).json(created);
  });

  r.patch("/:id", (req, res) => {
    const id = idParam(req);
    const body = parseBody(casePatchSchema, req.body);
    const user = currentUser(res);
    const updated = db.transaction(tx => {
      const before = mustGetCase(tx, id);
      if (!Object.keys(body).length) return before;
      checkUserRef(tx, body.leadAttorneyId);
      tx.update(cases).set(body).where(eq(cases.id, id)).run();
      const detail =
        body.status && body.status !== before.status
          ? `status: ${before.status} → ${body.status}`
          : `changed ${Object.keys(body).join(", ")}`;
      recordActivity(tx, {
        caseId: id,
        userId: user.id,
        action: "updated case",
        detail,
      });
      return mustGetCase(tx, id);
    });
    res.json(updated);
  });

  return r;
}
