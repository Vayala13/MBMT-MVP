import { USER_HEADER } from "@shared/types";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { openDb } from "./db/client";
import { seed } from "./db/seed";

let server: Server;
let base: string;

beforeAll(async () => {
  const db = openDb(":memory:");
  seed(db);
  server = createApp(db).listen(0);
  await new Promise(r => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
afterAll(() => {
  server.close();
});

const PARALEGAL = 2; // Pip Marlowe in the seed

async function api(
  method: string,
  path: string,
  body?: unknown,
  userId: number | null = PARALEGAL
) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(userId ? { [USER_HEADER]: String(userId) } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

describe("reads", () => {
  it("returns seeded users, cases, deadlines, tasks, templates", async () => {
    expect((await api("GET", "/users")).json).toHaveLength(5);
    expect((await api("GET", "/cases")).json).toHaveLength(25);
    expect((await api("GET", "/cases?status=active")).json).toHaveLength(15);
    expect((await api("GET", "/deadlines")).json).toHaveLength(18);
    expect((await api("GET", "/templates")).json).toHaveLength(5);
    const tasks = (await api("GET", "/tasks?topLevel=true")).json;
    expect(
      tasks.every(
        (t: { parentTaskId: number | null }) => t.parentTaskId === null
      )
    ).toBe(true);
  });

  it("returns a deadline with its change history", async () => {
    const all = (await api("GET", "/deadlines")).json as {
      id: number;
      kind: string;
    }[];
    const moved = all.find(d => d.kind === "rule_11")!;
    const detail = (await api("GET", `/deadlines/${moved.id}`)).json;
    expect(detail.changes[0].reason).toBe("Rule 11 agreement");
  });

  it("404s unknown ids and routes", async () => {
    expect((await api("GET", "/cases/9999")).status).toBe(404);
    expect((await api("GET", "/nope")).status).toBe(404);
  });
});

describe("writes", () => {
  it("refuse without a picked user", async () => {
    const r = await api("POST", "/notes", { caseId: 1, body: "hi" }, null);
    expect(r.status).toBe(401);
  });

  it("validate the body", async () => {
    const r = await api("POST", "/call-logs", {
      caseId: 1,
      direction: "sideways",
    });
    expect(r.status).toBe(400);
  });

  it("logging a call writes activity and updates the case's last touch", async () => {
    const r = await api("POST", "/call-logs", {
      caseId: 12,
      direction: "in",
      withWhom: "Test caller (fictional)",
      summary: "Checking in",
      followUpNeeded: true,
    });
    expect(r.status).toBe(201);
    const c = (await api("GET", "/cases/12")).json;
    expect(c.lastTouchedBy).toBe(PARALEGAL);
    expect(Date.now() - Date.parse(c.lastTouchedAt)).toBeLessThan(10_000);
    const [latest] = (await api("GET", "/activity?caseId=12&limit=1")).json;
    expect(latest).toMatchObject({ userId: PARALEGAL, action: "logged call" });
    expect(latest.detail).toContain("follow-up needed");
  });

  it("moving a deadline date requires a reason and records the change", async () => {
    const d = (
      await api("POST", "/deadlines", {
        caseId: 1,
        title: "Test deadline",
        kind: "internal",
        dueDate: "2030-01-10",
      })
    ).json;
    expect(
      (await api("PATCH", `/deadlines/${d.id}`, { dueDate: "2030-01-20" }))
        .status
    ).toBe(400);

    const ok = await api("PATCH", `/deadlines/${d.id}`, {
      dueDate: "2030-01-20",
      changeReason: "Court order",
    });
    expect(ok.json.dueDate).toBe("2030-01-20");
    const detail = (await api("GET", `/deadlines/${d.id}`)).json;
    expect(detail.changes).toMatchObject([
      {
        oldDate: "2030-01-10",
        newDate: "2030-01-20",
        reason: "Court order",
        changedBy: PARALEGAL,
      },
    ]);
    const [latest] = (await api("GET", "/activity?caseId=1&limit=1")).json;
    expect(latest.action).toBe("moved deadline");
    expect(latest.detail).toContain("1/10 → 1/20 · Court order");
  });

  it("completing a task writes 'completed task'", async () => {
    const t = (await api("POST", "/tasks", { caseId: 4, title: "Test task" }))
      .json;
    await api("PATCH", `/tasks/${t.id}`, { status: "done" });
    const [latest] = (await api("GET", "/activity?caseId=4&limit=1")).json;
    expect(latest).toMatchObject({
      action: "completed task",
      detail: "Test task",
    });
  });

  it("rejects a subtask on a different case than its parent", async () => {
    const parent = (await api("POST", "/tasks", { caseId: 4, title: "Parent" }))
      .json;
    const r = await api("POST", "/tasks", {
      caseId: 5,
      parentTaskId: parent.id,
      title: "Child",
    });
    expect(r.status).toBe(400);
  });

  it("template writes log firm-wide activity (no case)", async () => {
    const r = await api("POST", "/templates", {
      name: "Test template",
      subtasks: [
        { title: "Cite-check every authority", offset_days_before_due: 1 },
      ],
    });
    expect(r.status).toBe(201);
    const [latest] = (await api("GET", "/activity?limit=1")).json;
    expect(latest).toMatchObject({ caseId: null, action: "created template" });
  });
});

describe("no-op edits", () => {
  it("do not log activity or bump last touched", async () => {
    const before = (await api("GET", "/cases/13")).json;
    const r = await api("PATCH", "/cases/13", {});
    expect(r.status).toBe(200);
    expect((await api("GET", "/cases/13")).json.lastTouchedAt).toBe(
      before.lastTouchedAt
    );
  });
});
