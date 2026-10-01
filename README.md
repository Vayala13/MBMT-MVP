# MBMT Case Tracker (prototype)

A small case tracker for the MBMT paralegal team. One screen shows **what's due in the next 3 weeks, what's overdue, what's stale, and who touched what last**. The Today page runs the day from a prioritized to-do list and a day planner.

> **Prototype, demo data only.** Every name, cause number and fact in it is invented. Do not enter real client information: attorney-client privilege applies. It does not connect to the firm server, Outlook, Clio, the phones or any AI service.

## Start it (one command)

```bash
pnpm i && pnpm db:reset && pnpm dev
```

Then open **http://localhost:3000** in Chrome. Click **I acknowledge**, then pick a person (Juniper Oakes has the most work).

- `pnpm db:reset` wipes the demo database and loads fresh fake data. Run it any time to start over.
- Stop the app with **Ctrl+C** in the Terminal window.

### What you need first

| Need | How |
|---|---|
| **Node.js 22 or 24 (LTS)** | Download "LTS" from nodejs.org. Check with `node -v`. |
| **pnpm** | `npm install -g pnpm` (on a Mac, add `sudo` in front if it says "permission denied") |

No build tools (Xcode, Visual Studio) are needed. The database library ships ready-made for Mac, Windows and Linux.

**Mac tip:** if `node -v` shows a different version than the one you installed, an older Node from Homebrew is in the way. Run `brew unlink node`, open a new Terminal, and check again.

### Updating a ZIP download

1. Stop the app (**Ctrl+C**).
2. Delete the old copy:
   ```bash
   cd ~/Downloads && rm -rf MBMT-MVP-claude-great-ptolemy-208h7n MBMT-MVP-claude-great-ptolemy-208h7n*.zip
   ```
3. Download the ZIP again from GitHub (green **Code** button, then **Download ZIP**).
4. Unzip and open it:
   ```bash
   cd ~/Downloads && unzip -q MBMT-MVP-claude-great-ptolemy-208h7n.zip && cd MBMT-MVP-claude-great-ptolemy-208h7n
   ```
5. Run the one command above.

## What's in it

| Screen | What it's for |
|---|---|
| **Dashboard** | Key numbers, the 3-week deadline strip (week 3 always visible), countdown, stale cases, pending items. Click anything to open the side drawer. |
| **Today** | Your to-do list in priority order and an 8 am – 5 pm day planner (5–6 pm "staying late" hour). **Plan my day for me** fills it in for you. |
| **Calendar** | 1 week / 3 weeks / month, filter by person. Deadlines, tasks due and planned time. |
| **Cases** | Active, intake, referred-out and closed cases. Filters, stale-only, sort by last touched. Each case page has deadlines (with move history), tasks, calls, notes and activity. |
| **Templates** | Task templates (MSJ Reply, Motion to Compel…). Subtasks date themselves; drafting templates always include a cite-check. |
| **App permissions** | IT admin only (pick the IT admin user to see it). *Proposed* permissions by role inside this app, to confirm with Jesse and Tomas. Not enforced in the prototype. |

**Anywhere:** Log a call (key points, action items, transcript), Simulate incoming call (practice only), the **My work** switch in the sidebar (on by default), and a reminder banner for deadlines in the next 7 days.

### Keyboard shortcuts

| Key | Does |
|---|---|
| `C` | Log a call |
| `N` | New task |
| `/` | Search cases |

Shortcuts don't fire while you're typing in a field.

## Paralegal test script

Give each tester **20 minutes**. They work through these 6 tasks and say **one sentence each about what felt wrong**:

1. "What's due in the next three weeks? Is anything due on the third Monday?"
2. "Which cases haven't been touched in over a year?"
3. "A client just called on [case]. Log it and flag a follow-up."
4. "Opposing counsel agreed to push a deadline (Rule 11). Move it."
5. "Start an MSJ reply due in 10 days. Are the subtasks right? What's missing?"
6. "Plan your day. Block 2 hours to draft."

Then ask:

- *What would you use tomorrow?*
- *What's missing?*
- *What would you remove?*

**Before each tester:** run `pnpm db:reset` so everyone starts from the same data.

## For developers

| Command | What it does |
|---|---|
| `pnpm dev` | API + client on one port (Express + Vite), http://localhost:3000 |
| `pnpm db:reset` | Delete `data/mbmt.db`, run migrations, seed demo data |
| `pnpm check` | TypeScript check |
| `pnpm test` | Vitest (deadline, template, planner and API rules) |
| `pnpm db:generate` | New Drizzle migration after editing `server/db/schema.ts` |
| `pnpm build` / `pnpm start` | Production build and run |

```
client/  src/{components,components/ui,pages,lib,hooks}  index.html
server/  index.ts  app.ts  routes/  lib/  db/{schema.ts,seed.ts,migrations}
shared/  types.ts  schemas.ts  enums.ts  status.ts  dashboard.ts  templates.ts  today.ts  calendar.ts
```

- Stack: Vite, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Express, SQLite (better-sqlite3 + Drizzle), zod, date-fns, Vitest. Design: Zurich / Bern system from the portfolio (see `/styleguide`).
- Every write logs an activity row and updates the case's "last touched" (except moving a task on your own day planner).
- The local database (`data/`) and any `.env` file are git-ignored.
- Build plan, decisions and what's parked for v2 (phone integration, Outlook/Clio, AI features, real sign-in): see [PLAN.md](PLAN.md).
