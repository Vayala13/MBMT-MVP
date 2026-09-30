import { USER_HEADER, type User } from "../../shared/types";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import type { Db } from "../db/client";
import { users } from "../db/schema";
import { HttpError } from "./http";

/**
 * MVP stand-in for auth: writes must name the user chosen at the gate
 * via the x-mbmt-user header. Reads stay open (demo data only).
 */
export function requireUserForWrites(db: Db) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "GET" || req.method === "HEAD") return next();
    const id = Number(req.header(USER_HEADER));
    const user = Number.isInteger(id)
      ? db.select().from(users).where(eq(users.id, id)).get()
      : undefined;
    if (!user)
      return next(new HttpError(401, "Pick a user before making changes"));
    res.locals.user = user;
    next();
  };
}

export function currentUser(res: Response): User {
  return res.locals.user as User;
}
