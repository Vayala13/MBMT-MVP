import { Router } from "express";
import type { Db } from "../db/client";
import { requireUserForWrites } from "../lib/currentUser";
import { errorHandler } from "../lib/http";
import { activityRouter } from "./activity";
import { callLogsRouter } from "./callLogs";
import { casesRouter } from "./cases";
import { deadlinesRouter } from "./deadlines";
import { notesRouter } from "./notes";
import { tasksRouter } from "./tasks";
import { templatesRouter } from "./templates";
import { usersRouter } from "./users";

export function createApiRouter(db: Db) {
  const api = Router();

  api.get("/health", (_req, res) => {
    res.json({ ok: true, demoDataOnly: true });
  });

  api.use(requireUserForWrites(db));
  api.use("/users", usersRouter(db));
  api.use("/cases", casesRouter(db));
  api.use("/deadlines", deadlinesRouter(db));
  api.use("/tasks", tasksRouter(db));
  api.use("/call-logs", callLogsRouter(db));
  api.use("/notes", notesRouter(db));
  api.use("/templates", templatesRouter(db));
  api.use("/activity", activityRouter(db));

  api.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  api.use(errorHandler);
  return api;
}
