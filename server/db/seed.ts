/**
 * Demo seed data. EVERY name, cause number and fact below is invented.
 * Never add real client names or case facts here (attorney-client privilege).
 *
 * Dates are relative to the day you seed, so the dashboard always has
 * overdue items, a third-week deadline and stale cases to show.
 */
import { addDays, format, getDay, subDays } from "date-fns";
import type { TemplateSubtask } from "../../shared/enums";
import type { Db } from "./client";
import {
  activity,
  callLogs,
  cases,
  deadlineChanges,
  deadlines,
  notes,
  tasks,
  taskTemplates,
  users,
} from "./schema";

type UserKey = "attorney" | "paraA" | "paraB" | "clerk" | "admin";
type NewCase = typeof cases.$inferInsert;
type NewActivity = typeof activity.$inferInsert;

export const SEED_USERS: Record<UserKey, typeof users.$inferInsert> = {
  attorney: { name: "Octavia Fernsby", role: "attorney", initials: "OF" },
  paraA: { name: "Pip Marlowe", role: "paralegal", initials: "PM" },
  paraB: { name: "Juniper Oakes", role: "paralegal", initials: "JO" },
  clerk: { name: "Wren Tolliver", role: "file_clerk", initials: "WT" },
  admin: { name: "Cass Ironwood", role: "admin", initials: "CI" },
};

/** Cite-check is firm policy on every drafting template: nothing reaches an attorney without it. */
export const SEED_TEMPLATES: { name: string; subtasks: TemplateSubtask[] }[] = [
  {
    name: "MSJ Reply",
    subtasks: [
      {
        title: "Pull and label exhibits (A, B, C…)",
        offset_days_before_due: 8,
      },
      {
        title: "Check in with attorney on progress",
        offset_days_before_due: 6,
      },
      { title: "Draft reply", offset_days_before_due: 4 },
      { title: "Cite-check every authority", offset_days_before_due: 2 },
      { title: "Final review", offset_days_before_due: 1 },
      { title: "File", offset_days_before_due: 0 },
    ],
  },
  {
    name: "Motion to Compel",
    subtasks: [
      {
        title: "Review discovery responses for objections and omissions",
        offset_days_before_due: 7,
      },
      { title: "Draft motion", offset_days_before_due: 5 },
      { title: "Cite-check every authority", offset_days_before_due: 3 },
      { title: "Attorney review", offset_days_before_due: 2 },
      { title: "File", offset_days_before_due: 0 },
    ],
  },
  {
    name: "Deposition Outline",
    subtasks: [
      {
        title: "Gather petition, answer, discovery and client documents",
        offset_days_before_due: 7,
      },
      { title: "Draft outline", offset_days_before_due: 4 },
      { title: "Cite-check every authority", offset_days_before_due: 2 },
      { title: "Attorney review", offset_days_before_due: 1 },
    ],
  },
  {
    name: "Default Judgment (needs staff input)",
    subtasks: [
      {
        title:
          "Placeholder: confirm service and answer date (needs staff input)",
        offset_days_before_due: 7,
      },
      {
        title: "Draft motion for default judgment (needs staff input)",
        offset_days_before_due: 4,
      },
      { title: "Cite-check every authority", offset_days_before_due: 2 },
      { title: "File (needs staff input)", offset_days_before_due: 0 },
    ],
  },
  {
    name: "Answer to Petition (needs staff input)",
    subtasks: [
      {
        title: "Placeholder: review petition with attorney (needs staff input)",
        offset_days_before_due: 6,
      },
      { title: "Draft answer (needs staff input)", offset_days_before_due: 4 },
      { title: "Cite-check every authority", offset_days_before_due: 2 },
      { title: "File (needs staff input)", offset_days_before_due: 0 },
    ],
  },
];

type SeedCase = Omit<
  NewCase,
  "leadAttorneyId" | "openedAt" | "lastTouchedAt" | "lastTouchedBy"
> & {
  key: string;
  openedDaysAgo: number;
  /** Most recent touch: [days ago, who, action, detail] */
  touch: [number, UserKey, string, string];
};

const ACTIVE: SeedCase[] = [
  {
    key: "pemberton",
    caption: "Pemberton v. Hollow Oak Supply Co.",
    causeNo: "FAKE-24-CV-0112",
    clientName: "Marigold Pemberton",
    caseType: "Breach of contract",
    status: "active",
    openedDaysAgo: 240,
    touch: [1, "paraA", "logged call", "Call from Marigold Pemberton (client)"],
  },
  {
    key: "quillfeather",
    caption: "Quillfeather v. Bramblewood Transit LLC",
    causeNo: "FAKE-24-CV-0187",
    clientName: "Ansel Quillfeather",
    caseType: "Personal injury – auto",
    status: "active",
    openedDaysAgo: 310,
    touch: [
      2,
      "paraB",
      "added note",
      "Octavia wants exhibits tabbed by witness.",
    ],
  },
  {
    key: "marchbank",
    caption: "Marchbank v. Tidewell Logistics",
    causeNo: "FAKE-25-CV-0031",
    clientName: "Dorothea Marchbank",
    caseType: "Employment – retaliation",
    status: "active",
    openedDaysAgo: 180,
    touch: [
      2,
      "paraB",
      "moved deadline",
      "Response to motion to compel · Rule 11 agreement",
    ],
  },
  {
    key: "fennimore",
    caption: "Fennimore Bakeries LLC v. Larkspur Ovens Inc.",
    causeNo: "FAKE-25-CV-0058",
    clientName: "Fennimore Bakeries LLC",
    caseType: "Commercial – warranty",
    status: "active",
    openedDaysAgo: 40,
    touch: [3, "attorney", "updated case", "changed caseType"],
  },
  {
    key: "oddsworth",
    caption: "Oddsworth v. Gristmill Apartments",
    causeNo: "FAKE-24-CV-0240",
    clientName: "Felix Oddsworth",
    caseType: "Premises liability",
    status: "active",
    openedDaysAgo: 400,
    touch: [9, "paraB", "added task", "Email expert re: report status"],
  },
  {
    key: "thistlewood",
    caption: "Thistlewood v. Copperkettle Insurance Co.",
    causeNo: "FAKE-24-CV-0301",
    clientName: "Imogen Thistlewood",
    caseType: "Insurance bad faith",
    status: "active",
    openedDaysAgo: 280,
    touch: [6, "paraA", "completed deadline", "Serve initial disclosures"],
  },
  {
    key: "brindle",
    caption: "Brindle Holdings v. Sparrowgate Builders",
    causeNo: "FAKE-25-CV-0077",
    clientName: "Brindle Holdings LP",
    caseType: "Construction defect",
    status: "active",
    openedDaysAgo: 120,
    touch: [
      4,
      "clerk",
      "added task",
      "Confirm inspection time with opposing counsel",
    ],
  },
  {
    key: "ashcombe",
    caption: "Ashcombe v. Velvetine Motors",
    causeNo: "FAKE-25-CV-0090",
    clientName: "Rupert Ashcombe",
    caseType: "Deceptive trade practices",
    status: "active",
    openedDaysAgo: 150,
    touch: [5, "paraA", "added task", "Assemble mediation binder"],
  },
  {
    key: "nettlefield",
    caption: "Nettlefield v. Moonrake Freight",
    causeNo: "FAKE-24-CV-0266",
    clientName: "Clementine Nettlefield",
    caseType: "Personal injury – trucking",
    status: "active",
    openedDaysAgo: 330,
    touch: [
      5,
      "paraB",
      "logged call",
      "Call from Clerk, 999th District Court (fictional)",
    ],
  },
  {
    key: "pollywog",
    caption: "Pollywog Café LLC v. Hartwell Leasing",
    causeNo: "FAKE-25-CV-0102",
    clientName: "Pollywog Café LLC",
    caseType: "Commercial lease",
    status: "active",
    openedDaysAgo: 90,
    touch: [12, "clerk", "added task", "Pull lease file from storage"],
  },
  {
    key: "grimsby",
    caption: "Grimsby v. Starling Medical Supply",
    causeNo: "FAKE-23-CV-0415",
    clientName: "Horace Grimsby",
    caseType: "Product liability",
    status: "active",
    openedDaysAgo: 900,
    touch: [420, "paraA", "added note", "Client moved; new address pending."],
  },
  {
    key: "merriweather",
    caption: "Merriweather v. Plumtree HOA",
    causeNo: "FAKE-23-CV-0388",
    clientName: "Beatrix Merriweather",
    caseType: "HOA dispute",
    status: "active",
    openedDaysAgo: 800,
    touch: [510, "attorney", "updated case", "changed leadAttorneyId"],
  },
  {
    key: "bexley",
    caption: "Bexley v. Cobblestone Rideshare",
    causeNo: "FAKE-24-CV-0019",
    clientName: "Tobias Bexley",
    caseType: "Personal injury – auto",
    status: "active",
    openedDaysAgo: 700,
    touch: [390, "paraB", "logged call", "Call to Tobias Bexley (client)"],
  },
  {
    key: "kettleby",
    caption: "Kettleby v. Juniperline Staffing",
    causeNo: "FAKE-25-CV-0120",
    clientName: "Mabel Kettleby",
    caseType: "Employment – wage claim",
    status: "active",
    openedDaysAgo: 75,
    touch: [
      7,
      "paraA",
      "added deadline",
      "Send client draft interrogatory answers",
    ],
  },
  {
    key: "rookwood",
    caption: "Rookwood Farms v. Silverbeck Feed Co.",
    causeNo: "FAKE-25-CV-0134",
    clientName: "Rookwood Farms Inc.",
    caseType: "Breach of contract",
    status: "active",
    openedDaysAgo: 30,
    touch: [8, "paraA", "added deadline", "Initial disclosures"],
  },
];

const INTAKE: SeedCase[] = [
  {
    key: "wickersham",
    caption: "Wickersham — slip and fall inquiry",
    causeNo: null,
    clientName: "Tansy Wickersham",
    caseType: "Premises liability",
    status: "inquiry",
    openedDaysAgo: 1,
    touch: [
      1,
      "clerk",
      "logged call",
      "Call from Tansy Wickersham (prospective client) · follow-up needed",
    ],
  },
  {
    key: "crowthorne",
    caption: "Crowthorne — supplier contract inquiry",
    causeNo: null,
    clientName: "Barnaby Crowthorne",
    caseType: "Breach of contract",
    status: "inquiry",
    openedDaysAgo: 6,
    touch: [
      6,
      "clerk",
      "opened case",
      "Crowthorne — supplier contract inquiry",
    ],
  },
  {
    key: "fairweather",
    caption: "Fairweather — lease deposit inquiry",
    causeNo: null,
    clientName: "Odette Fairweather",
    caseType: "Landlord–tenant",
    status: "inquiry",
    openedDaysAgo: 10,
    touch: [10, "paraA", "opened case", "Fairweather — lease deposit inquiry"],
  },
  {
    key: "pennywhistle",
    caption: "Pennywhistle — wrongful termination consult",
    causeNo: null,
    clientName: "Lucius Pennywhistle",
    caseType: "Employment – termination",
    status: "consult",
    openedDaysAgo: 14,
    touch: [4, "attorney", "updated case", "status: inquiry → consult"],
  },
  {
    key: "figwort",
    caption: "Estate of Ambrose Figwort",
    causeNo: null,
    clientName: "Hester Figwort",
    caseType: "Probate",
    status: "referred_out",
    referredTo: "Hazelmere Probate Law (fictional)",
    openedDaysAgo: 45,
    touch: [40, "paraB", "updated case", "status: inquiry → referred_out"],
  },
  {
    key: "quintavalle",
    caption: "Quintavalle — visa status question",
    causeNo: null,
    clientName: "Rosalind Quintavalle",
    caseType: "Immigration",
    status: "referred_out",
    referredTo: "Northgate Immigration Clinic (fictional)",
    openedDaysAgo: 60,
    touch: [58, "clerk", "updated case", "status: inquiry → referred_out"],
  },
];

const CLOSED: SeedCase[] = [
  {
    key: "dunmore",
    caption: "Dunmore v. Pickering Hardware",
    causeNo: "FAKE-22-CV-0501",
    clientName: "Silas Dunmore",
    caseType: "Premises liability",
    status: "closed",
    openedDaysAgo: 1100,
    touch: [200, "attorney", "updated case", "status: active → closed"],
  },
  {
    key: "wexley",
    caption: "Wexley v. Glassworth Glazing",
    causeNo: "FAKE-23-CV-0044",
    clientName: "Ophelia Wexley",
    caseType: "Construction defect",
    status: "closed",
    openedDaysAgo: 950,
    touch: [150, "attorney", "updated case", "status: active → closed"],
  },
  {
    key: "harrowgate",
    caption: "Harrowgate Tile Co. v. Bellfounder Co.",
    causeNo: "FAKE-23-CV-0210",
    clientName: "Harrowgate Tile Co.",
    caseType: "Breach of contract",
    status: "closed",
    openedDaysAgo: 700,
    touch: [90, "paraA", "updated case", "status: active → closed"],
  },
  {
    key: "muncaster",
    caption: "Muncaster v. Pebblebrook Movers",
    causeNo: "FAKE-24-CV-0005",
    clientName: "Eliza Muncaster",
    caseType: "Property damage",
    status: "closed",
    openedDaysAgo: 500,
    touch: [60, "paraB", "updated case", "status: active → closed"],
  },
];

export const SEED_CASES = [...ACTIVE, ...INTAKE, ...CLOSED];

export function seed(db: Db, today: Date = new Date()) {
  const ymd = (d: Date) => format(d, "yyyy-MM-dd");
  /** A weekday `n` days from today (weekends slide toward today's side so overdue stays overdue). */
  const due = (n: number) => {
    let d = addDays(today, n);
    const wd = getDay(d);
    if (wd === 6) d = n < 0 ? subDays(d, 1) : addDays(d, 2);
    if (wd === 0) d = n < 0 ? subDays(d, 2) : addDays(d, 1);
    return ymd(d);
  };
  /** A moment `n` days ago at 10:00 local. */
  const ago = (n: number, hour = 10) => {
    const d = subDays(today, n);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  // The "third-week Monday": the Monday in week 3 of the 21-day strip.
  // Day 1 is today, so days 15–21 are offsets 14–20 from today.
  const thirdMonday = [14, 15, 16, 17, 18, 19, 20].find(
    n => getDay(addDays(today, n)) === 1
  )!;
  const dayOf = (iso: string, n: number) =>
    ymd(addDays(new Date(`${iso}T12:00:00`), n));

  db.transaction(tx => {
    // ---- Users
    const u = {} as Record<UserKey, number>;
    for (const [key, row] of Object.entries(SEED_USERS) as [
      UserKey,
      typeof users.$inferInsert,
    ][]) {
      u[key] = tx
        .insert(users)
        .values(row)
        .returning({ id: users.id })
        .get().id;
    }

    // ---- Templates
    const tpl: Record<string, number> = {};
    for (const t of SEED_TEMPLATES) {
      tpl[t.name] = tx
        .insert(taskTemplates)
        .values(t)
        .returning({ id: taskTemplates.id })
        .get().id;
    }

    // ---- Cases (+ an "opened case" row and a most-recent touch row each)
    const c: Record<string, number> = {};
    const log: NewActivity[] = [];
    for (const { key, openedDaysAgo, touch, ...row } of SEED_CASES) {
      const [touchAgo, who, action, detail] = touch;
      const id = tx
        .insert(cases)
        .values({
          ...row,
          leadAttorneyId: row.status === "inquiry" ? null : u.attorney,
          openedAt: ymd(subDays(today, openedDaysAgo)),
          lastTouchedAt: ago(touchAgo),
          lastTouchedBy: u[who],
        })
        .returning({ id: cases.id })
        .get().id;
      c[key] = id;
      if (action !== "opened case") {
        log.push({
          caseId: id,
          userId: u.clerk,
          action: "opened case",
          detail: row.caption,
          createdAt: ago(openedDaysAgo, 9),
        });
      }
      log.push({
        caseId: id,
        userId: u[who],
        action,
        detail,
        createdAt: ago(touchAgo),
      });
    }

    // ---- Deadlines
    type D = typeof deadlines.$inferInsert;
    const addDeadline = (row: D) =>
      tx.insert(deadlines).values(row).returning({ id: deadlines.id }).get().id;
    const msjReplyDue = due(thirdMonday);

    // 4 overdue (open, due before today)
    addDeadline({
      caseId: c.pemberton,
      title: "Serve responses to second requests for production",
      kind: "statutory",
      dueDate: due(-3),
      assignedTo: u.paraA,
      sourceNote: "30 days from service of requests",
    });
    addDeadline({
      caseId: c.oddsworth,
      title: "Designate expert witnesses",
      kind: "court_ordered",
      dueDate: due(-6),
      assignedTo: u.paraB,
      sourceNote: "Scheduling order ¶ 4",
    });
    addDeadline({
      caseId: c.nettlefield,
      title: "Respond to motion to dismiss",
      kind: "statutory",
      dueDate: due(-1),
      assignedTo: u.paraB,
      sourceNote: "Entered by staff from local rules",
    });
    addDeadline({
      caseId: c.kettleby,
      title: "Send client draft interrogatory answers",
      kind: "internal",
      dueDate: due(-2),
      assignedTo: u.paraA,
    });

    // The third-week Monday case (strip days 15–21)
    addDeadline({
      caseId: c.quillfeather,
      title: "Reply in support of MSJ",
      kind: "court_ordered",
      dueDate: msjReplyDue,
      assignedTo: u.paraB,
      sourceNote: "Order setting MSJ hearing",
    });
    addDeadline({
      caseId: c.quillfeather,
      title: "Hearing on MSJ",
      kind: "court_ordered",
      dueDate: dayOf(msjReplyDue, 10),
      assignedTo: u.attorney,
    });

    // Moved by Rule 11 agreement, with history
    const originalDate = due(4);
    const movedDate = due(18);
    const movedId = addDeadline({
      caseId: c.marchbank,
      title: "Response to motion to compel",
      kind: "rule_11",
      dueDate: movedDate,
      assignedTo: u.paraB,
      sourceNote:
        "Rule 11 agreement with opposing counsel, filed with the court",
    });
    tx.insert(deadlineChanges)
      .values({
        deadlineId: movedId,
        oldDate: originalDate,
        newDate: movedDate,
        reason: "Rule 11 agreement",
        changedBy: u.paraB,
        changedAt: ago(2),
      })
      .run();

    // Spread across the next weeks
    addDeadline({
      caseId: c.brindle,
      title: "Site inspection prep",
      kind: "internal",
      dueDate: due(2),
      assignedTo: u.clerk,
    });
    addDeadline({
      caseId: c.fennimore,
      title: "Answer due",
      kind: "statutory",
      dueDate: due(5),
      assignedTo: u.paraA,
      sourceNote: "Monday after 20 days from service",
    });
    addDeadline({
      caseId: c.ashcombe,
      title: "Mediation statement to mediator",
      kind: "internal",
      dueDate: due(6),
      assignedTo: u.paraA,
    });
    addDeadline({
      caseId: c.thistlewood,
      title: "Pretrial disclosures",
      kind: "court_ordered",
      dueDate: due(9),
      assignedTo: u.paraA,
      sourceNote: "Docket control order",
    });
    addDeadline({
      caseId: c.pollywog,
      title: "Deadline to amend pleadings",
      kind: "court_ordered",
      dueDate: due(12),
      assignedTo: u.paraB,
      sourceNote: "Docket control order",
    });
    addDeadline({
      caseId: c.rookwood,
      title: "Initial disclosures",
      kind: "statutory",
      dueDate: due(14),
      assignedTo: u.paraA,
    });
    addDeadline({
      caseId: c.grimsby,
      title: "Hearing on dismissal for want of prosecution",
      kind: "court_ordered",
      dueDate: due(25),
      assignedTo: u.attorney,
      sourceNote: "Notice of intent to dismiss (arrived by mail)",
    });
    addDeadline({
      caseId: c.pemberton,
      title: "Mediation",
      kind: "court_ordered",
      dueDate: due(30),
      assignedTo: u.attorney,
    });
    addDeadline({
      caseId: c.oddsworth,
      title: "Discovery cutoff",
      kind: "court_ordered",
      dueDate: due(40),
      assignedTo: u.paraB,
    });

    // Already done
    addDeadline({
      caseId: c.pemberton,
      title: "File original petition",
      kind: "statutory",
      dueDate: due(-235),
      assignedTo: u.paraA,
      doneAt: ago(236),
    });
    addDeadline({
      caseId: c.thistlewood,
      title: "Serve initial disclosures",
      kind: "statutory",
      dueDate: due(-6),
      assignedTo: u.paraA,
      doneAt: ago(6),
    });

    // ---- Tasks
    type T = typeof tasks.$inferInsert;
    const addTask = (row: T) =>
      tx.insert(tasks).values(row).returning({ id: tasks.id }).get().id;

    // MSJ reply built from the template, subtasks offset from the parent due date
    const msjTemplate = SEED_TEMPLATES.find(t => t.name === "MSJ Reply")!;
    const msjParent = addTask({
      caseId: c.quillfeather,
      title: "MSJ Reply",
      assignedTo: u.paraB,
      dueDate: msjReplyDue,
      priority: 1,
      templateId: tpl["MSJ Reply"],
    });
    for (const s of msjTemplate.subtasks) {
      addTask({
        caseId: c.quillfeather,
        parentTaskId: msjParent,
        title: s.title,
        assignedTo: u.paraB,
        dueDate: dayOf(msjReplyDue, -s.offset_days_before_due),
        priority: 1,
        templateId: tpl["MSJ Reply"],
      });
    }

    // 3 overdue open tasks
    addTask({
      caseId: c.pemberton,
      title: "Chase client for signed verification",
      assignedTo: u.paraA,
      dueDate: due(-2),
      priority: 1,
    });
    addTask({
      caseId: c.oddsworth,
      title: "Email expert re: report status",
      assignedTo: u.paraB,
      dueDate: due(-4),
      priority: 1,
    });
    addTask({
      caseId: c.nettlefield,
      title: "Draft response to motion to dismiss",
      assignedTo: u.paraB,
      dueDate: due(-1),
      priority: 1,
    });

    // Upcoming
    addTask({
      caseId: c.fennimore,
      title: "Draft answer",
      assignedTo: u.paraA,
      dueDate: due(3),
      priority: 1,
      scheduledDate: ymd(today),
      scheduledStart: "09:00",
      scheduledEnd: "11:00",
    });
    addTask({
      caseId: c.brindle,
      title: "Confirm inspection time with opposing counsel",
      assignedTo: u.clerk,
      dueDate: due(1),
      priority: 2,
    });
    addTask({
      caseId: c.ashcombe,
      title: "Assemble mediation binder",
      assignedTo: u.paraA,
      dueDate: due(5),
      priority: 2,
    });
    addTask({
      caseId: c.pollywog,
      title: "Pull lease file from storage",
      assignedTo: u.clerk,
      dueDate: ymd(today),
      priority: 3,
    });
    addTask({
      caseId: c.marchbank,
      title: "Draft response to motion to compel",
      assignedTo: u.paraB,
      dueDate: dayOf(movedDate, -3),
      priority: 1,
    });
    addTask({
      caseId: c.rookwood,
      title: "Prepare initial disclosures",
      assignedTo: u.paraA,
      dueDate: due(10),
      priority: 2,
    });
    addTask({
      caseId: c.wickersham,
      title: "Call back Tansy Wickersham to set consult",
      assignedTo: u.clerk,
      dueDate: due(1),
      priority: 2,
    });
    // Done
    addTask({
      caseId: c.pemberton,
      title: "Calendar mediation date",
      assignedTo: u.paraA,
      dueDate: due(-20),
      priority: 2,
      status: "done",
    });

    // ---- Call logs
    const addCall = (row: typeof callLogs.$inferInsert) =>
      tx.insert(callLogs).values(row).run();
    addCall({
      caseId: c.pemberton,
      userId: u.paraA,
      direction: "in",
      withWhom: "Marigold Pemberton (client)",
      summary:
        "Asked about the mediation date. Explained the process and what to bring.",
      followUpNeeded: false,
      createdAt: ago(1),
    });
    addCall({
      caseId: c.quillfeather,
      userId: u.paraB,
      direction: "out",
      withWhom: "Opposing counsel's assistant",
      summary:
        "Confirmed they will not oppose a page-limit extension for the reply.",
      followUpNeeded: false,
      createdAt: ago(3),
    });
    addCall({
      caseId: c.wickersham,
      userId: u.clerk,
      direction: "in",
      withWhom: "Tansy Wickersham (prospective client)",
      summary:
        "Slip and fall at a grocery store (fictional). Wants a consult this week.",
      followUpNeeded: true,
      createdAt: ago(1),
    });
    addCall({
      caseId: c.nettlefield,
      userId: u.paraB,
      direction: "in",
      withWhom: "Clerk, 999th District Court (fictional)",
      summary: "Hearing on the motion to dismiss may be set next month.",
      followUpNeeded: true,
      createdAt: ago(5),
    });
    addCall({
      caseId: c.bexley,
      userId: u.paraB,
      direction: "out",
      withWhom: "Tobias Bexley (client)",
      summary: "Left voicemail about medical records. No call back yet.",
      followUpNeeded: true,
      createdAt: ago(390),
    });
    log.push({
      caseId: c.quillfeather,
      userId: u.paraB,
      action: "logged call",
      detail: "Call to Opposing counsel's assistant",
      createdAt: ago(3),
    });

    // ---- Notes
    const addNote = (row: typeof notes.$inferInsert) =>
      tx.insert(notes).values(row).run();
    addNote({
      caseId: c.quillfeather,
      taskId: msjParent,
      userId: u.paraB,
      body: "Octavia wants exhibits tabbed by witness.",
      createdAt: ago(2),
    });
    addNote({
      caseId: c.grimsby,
      userId: u.paraA,
      body: "Client moved; new address pending.",
      createdAt: ago(420),
    });
    addNote({
      caseId: c.pemberton,
      userId: u.attorney,
      body: "Client prefers email over phone for scheduling.",
      createdAt: ago(15),
    });
    log.push({
      caseId: c.pemberton,
      userId: u.attorney,
      action: "added note",
      detail: "Client prefers email over phone for scheduling.",
      createdAt: ago(15),
    });

    // ---- Firm-wide activity (no case)
    log.push({
      caseId: null,
      userId: u.paraA,
      action: "created template",
      detail: "MSJ Reply",
      createdAt: ago(30),
    });

    tx.insert(activity).values(log).run();
  });
}
