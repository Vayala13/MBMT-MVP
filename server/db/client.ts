import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;
/** A drizzle transaction handle; accepts the same queries as Db. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** One local file, easy to wipe and re-seed. Override with MBMT_DB (":memory:" works). */
export const DB_FILE =
  process.env.MBMT_DB ?? path.resolve(process.cwd(), "data", "mbmt.db");
const MIGRATIONS = path.resolve(process.cwd(), "server", "db", "migrations");

export function openDb(file: string = DB_FILE): Db {
  if (file !== ":memory:")
    fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS });
  return db;
}

/** Deletes the database file (plus WAL side files). */
export function deleteDbFile(file: string = DB_FILE) {
  for (const f of [file, `${file}-wal`, `${file}-shm`])
    fs.rmSync(f, { force: true });
}
