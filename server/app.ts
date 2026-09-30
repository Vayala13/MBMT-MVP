import express from "express";
import type { Db } from "./db/client";
import { createApiRouter } from "./routes";

/** The API app, separate from the dev/prod client serving so tests can mount it. */
export function createApp(db: Db) {
  const app = express();
  app.use(express.json());
  app.use("/api", createApiRouter(db));
  return app;
}
