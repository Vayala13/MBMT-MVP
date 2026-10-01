import { ymd } from "@shared/dates";
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
  return {
    status: res.status,
    json: res.status === 204 ? null : await res.json(),
  };
}

describe("reads", () => {
  it("returns seeded users, cases, deadlines, tasks, templates", async () => {
    expect((await api("GET", "/users")).json).toHaveLength(6);
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

  it("can include change history in the deadline list", async () => {
    const rows = (await api("GET", "/deadlines?includeChanges=true")).json as {
      kind: string;
      changes: { reason: string }[];
    }[];
    expect(rows.every(r => Array.isArray(r.changes))).toBe(true);
    expect(rows.find(r => r.kind === "rule_11")!.changes[0].reason).toBe(
      "Rule 11 agreement"
    );
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

  it("a call flagged for follow-up auto-creates a task for the caller", async () => {
    const r = await api("POST", "/call-logs", {
      caseId: 3,
      direction: "out",
      withWhom: "Opposing counsel (fictional)",
      summary: "Asked about deposition dates",
      followUpNeeded: true,
    });
    expect(r.json.followUpTaskId).toEqual(expect.any(Number));
    const t = (await api("GET", `/tasks/${r.json.followUpTaskId}`)).json;
    expect(t).toMatchObject({
      caseId: 3,
      title: "Follow up: call with Opposing counsel (fictional)",
      assignedTo: PARALEGAL,
      status: "open",
      priority: 1,
    });
    // Local date, same as the server; toISOString() is UTC and flips early in US evenings.
    expect(t.dueDate > ymd(new Date())).toBe(true);

    const plain = await api("POST", "/call-logs", {
      caseId: 3,
      direction: "in",
      withWhom: "Client",
      summary: "Just checking in",
      followUpNeeded: false,
    });
    expect(plain.json.followUpTaskId).toBeNull();
  });

  it("saves key points, action items and a transcript; action items become tasks", async () => {
    const r = await api("POST", "/call-logs", {
      caseId: 5,
      direction: "in",
      withWhom: "Client (fictional)",
      summary: "Discussed expert report timing",
      keyPoints: ["Expert report is late", "Client prefers email"],
      actionItems: ["Email expert for status", "Send client the report draft"],
      transcript: "Paralegal: Hello.\nClient: Hi.",
    });
    expect(r.status).toBe(201);
    expect(r.json).toMatchObject({
      keyPoints: ["Expert report is late", "Client prefers email"],
      actionItems: ["Email expert for status", "Send client the report draft"],
      transcript: "Paralegal: Hello.\nClient: Hi.",
      followUpTaskId: null,
    });
    expect(r.json.actionItemTaskIds).toHaveLength(2);
    const t = (await api("GET", `/tasks/${r.json.actionItemTaskIds[1]}`)).json;
    expect(t).toMatchObject({
      caseId: 5,
      title: "Send client the report draft",
      assignedTo: PARALEGAL,
    });
    const [latest] = (await api("GET", "/activity?caseId=5&limit=1")).json;
    expect(latest).toMatchObject({ action: "logged call" });
    expect(latest.detail).toContain("2 action items");
  });

  it("can keep action items as notes only (no tasks)", async () => {
    const r = await api("POST", "/call-logs", {
      caseId: 5,
      direction: "out",
      withWhom: "Court clerk (fictional)",
      summary: "Checked hearing date",
      actionItems: ["Maybe call back Friday"],
      actionItemsToTasks: false,
    });
    expect(r.json.actionItemTaskIds).toEqual([]);
    expect(r.json.actionItems).toEqual(["Maybe call back Friday"]);
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

describe("templates", () => {
  it("creating a task from MSJ Reply makes the parent and 6 dated subtasks", async () => {
    const templates = (await api("GET", "/templates")).json as {
      id: number;
      name: string;
    }[];
    const msj = templates.find(t => t.name === "MSJ Reply")!;
    const r = await api("POST", "/tasks/from-template", {
      caseId: 2,
      templateId: msj.id,
      dueDate: "2026-10-09", // Fri
    });
    expect(r.status).toBe(201);
    expect(r.json).toMatchObject({
      title: "MSJ Reply",
      dueDate: "2026-10-09",
      assignedTo: PARALEGAL,
      templateId: msj.id,
    });
    expect(r.json.subtasks.map((s: { dueDate: string }) => s.dueDate)).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-05",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
    ]);
    expect(
      r.json.subtasks.every(
        (s: { parentTaskId: number }) => s.parentTaskId === r.json.id
      )
    ).toBe(true);
    const [latest] = (await api("GET", "/activity?caseId=2&limit=1")).json;
    expect(latest).toMatchObject({
      action: "added task from template",
      detail: "MSJ Reply · 6 subtasks",
    });
  });

  it("adds a cite-check to any drafting template that lacks one", async () => {
    const r = await api("POST", "/templates", {
      name: "Response to Motion",
      subtasks: [
        { title: "Draft response", offset_days_before_due: 5 },
        { title: "File", offset_days_before_due: 0 },
      ],
    });
    expect(r.json.citeCheckAdded).toBe(true);
    expect(r.json.subtasks.map((s: { title: string }) => s.title)).toEqual([
      "Draft response",
      "Cite-check every authority",
      "File",
    ]);
    const edit = await api("PATCH", `/templates/${r.json.id}`, {
      subtasks: [{ title: "Draft brief", offset_days_before_due: 4 }],
    });
    expect(edit.json.citeCheckAdded).toBe(true);
  });

  it("deletes a template but keeps tasks made from it", async () => {
    const t = (
      await api("POST", "/templates", {
        name: "Temp",
        subtasks: [{ title: "Step", offset_days_before_due: 1 }],
      })
    ).json;
    const made = (
      await api("POST", "/tasks/from-template", {
        caseId: 1,
        templateId: t.id,
        dueDate: "2026-11-02",
      })
    ).json;
    expect((await api("DELETE", `/templates/${t.id}`)).status).toBe(204);
    expect((await api("GET", `/templates/${t.id}`)).status).toBe(404);
    const kept = (await api("GET", `/tasks/${made.id}`)).json;
    expect(kept).toMatchObject({ title: "Temp", templateId: null });
    expect(kept.subtasks).toHaveLength(1);
  });
});

describe("time blocks", () => {
  it("rejects a block that ends before it starts", async () => {
    const t = (await api("POST", "/tasks", { caseId: 1, title: "Block me" }))
      .json;
    const bad = await api("PATCH", `/tasks/${t.id}`, {
      scheduledDate: "2026-10-01",
      scheduledStart: "10:00",
      scheduledEnd: "09:30",
    });
    expect(bad.status).toBe(400);
    const ok = await api("PATCH", `/tasks/${t.id}`, {
      scheduledDate: "2026-10-01",
      scheduledStart: "09:00",
      scheduledEnd: "11:00",
    });
    expect(ok.json).toMatchObject({
      scheduledStart: "09:00",
      scheduledEnd: "11:00",
    });
  });
});

describe("delegation", () => {
  it("reassigning a task moves it between people's work lists and logs who → who", async () => {
    const t = (
      await api("POST", "/tasks", {
        caseId: 6,
        title: "Hand me off",
        assignedTo: 2,
      })
    ).json;
    const pipBefore = (await api("GET", "/tasks?assignedTo=2&status=open")).json
      .length;
    const junBefore = (await api("GET", "/tasks?assignedTo=3&status=open")).json
      .length;

    const r = await api("PATCH", `/tasks/${t.id}`, {
      assignedTo: 3,
      dueDate: "2030-02-01",
    });
    expect(r.json).toMatchObject({ assignedTo: 3, dueDate: "2030-02-01" });
    expect(
      (await api("GET", "/tasks?assignedTo=2&status=open")).json
    ).toHaveLength(pipBefore - 1);
    expect(
      (await api("GET", "/tasks?assignedTo=3&status=open")).json
    ).toHaveLength(junBefore + 1);

    const recent = (await api("GET", "/activity?caseId=6&limit=2")).json.map(
      (a: { action: string; detail: string }) => `${a.action}: ${a.detail}`
    );
    expect(recent).toEqual(
      expect.arrayContaining([
        "reassigned task: Hand me off: Pip Marlowe → Juniper Oakes",
        "changed task due date: Hand me off: no date → 2/1",
      ])
    );
  });

  it("reassigning a deadline logs who → who", async () => {
    const d = (
      await api("POST", "/deadlines", {
        caseId: 6,
        title: "Hand-off deadline",
        kind: "internal",
        dueDate: "2030-03-01",
        assignedTo: 2,
      })
    ).json;
    await api("PATCH", `/deadlines/${d.id}`, { assignedTo: 1 });
    const [latest] = (await api("GET", "/activity?caseId=6&limit=1")).json;
    expect(latest).toMatchObject({
      action: "reassigned deadline",
      detail: "Hand-off deadline: Pip Marlowe → Octavia Fernsby",
    });
  });

  it("planning a task on the day planner doesn't touch the case", async () => {
    const t = (await api("POST", "/tasks", { caseId: 7, title: "Plan me" }))
      .json;
    const before = (await api("GET", "/cases/7")).json.lastTouchedAt;
    await new Promise(r => setTimeout(r, 5));
    await api("PATCH", `/tasks/${t.id}`, {
      scheduledDate: "2030-01-01",
      scheduledStart: "09:00",
      scheduledEnd: "10:00",
    });
    expect((await api("GET", "/cases/7")).json.lastTouchedAt).toBe(before);
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
