import { asc } from "drizzle-orm";
import { Router } from "express";
import type { Db } from "../db/client";
import { users } from "../db/schema";

export function usersRouter(db: Db) {
  const r = Router();
  r.get("/", (_req, res) => {
    res.json(db.select().from(users).orderBy(asc(users.id)).all());
  });
  return r;
}
