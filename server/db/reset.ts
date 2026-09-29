/** pnpm db:reset — wipe the local SQLite file, re-run migrations, re-seed demo data. */
import { count } from "drizzle-orm";
import { DB_FILE, deleteDbFile, openDb } from "./client";
import {
  activity,
  cases,
  deadlines,
  tasks,
  taskTemplates,
  users,
} from "./schema";
import { seed } from "./seed";

deleteDbFile(DB_FILE);
const db = openDb(DB_FILE);
seed(db);

const n = (
  t:
    | typeof users
    | typeof cases
    | typeof deadlines
    | typeof tasks
    | typeof taskTemplates
    | typeof activity
) => db.select({ n: count() }).from(t).get()!.n;
console.log(`Reset ${DB_FILE}`);
console.log(
  `Seeded (demo data only): ${n(users)} users · ${n(cases)} cases · ${n(deadlines)} deadlines · ${n(tasks)} tasks · ${n(taskTemplates)} templates · ${n(activity)} activity rows`
);
