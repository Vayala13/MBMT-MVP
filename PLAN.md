# MBMT Case Tracker — MVP Build Plan for Claude Code

> **How to use this file:** Put it in the root of a new, empty repo as `PLAN.md`. Start Claude Code in that folder and say:
> *"Read PLAN.md. Build Phase 0, then stop and show me. Do one phase at a time and wait for my OK before the next."*

---

## 0. Context (read first)

**Who it's for:** The paralegals and staff at MBMT, a small civil-litigation firm (attorneys incl. Tomas; staff Sam/Samantha, Mayra, April the file clerk, Joseph; IT admin Jesse, off-site).

**The problem, in their words:**
- "If I could absolutely say one thing that we're lacking is a case management program."
- The firm is too small to pay for commercial case management software. Every decision "boils down to the money."
- Deadlines get calendared by hand. A motion-to-dismiss window was missed because it was never passed to the person who calendars.
- The team plans two weeks ahead. "There's an MSJ reply due on Monday and you didn't catch it... because we only look at two weeks."
- Case status lives in people's heads and in two spreadsheets (a general **case list** of all inquiries and an **active cases** sheet).
- Phone calls are tracked by word of mouth.

**What the MVP must prove:** A paralegal can open one screen and see **what's due in the next 3 weeks, what's overdue, what's stale, and who touched what last.** They can also run their day from a to-do list without rewriting the same subtasks every time.

**What the MVP is NOT:** It does not connect to the firm server, Outlook, Clio, or Claude yet. Those need Jesse (IT) and Tomas's sign-off. The MVP runs on **fake seed data only**. This is required: attorney-client privilege applies from the moment someone says they want to hire the firm, so no real client data goes into a prototype.

---

## 1. Tech Stack (match the portfolio repo)

Use the same stack as `vayala13/viviana-ayala-portfolio` so styles and components copy over directly.

| Layer | Choice |
|---|---|
| Build | Vite + TypeScript |
| UI | React 19, Tailwind CSS v4 (`@import "tailwindcss"`, `@theme` tokens), `tw-animate-css` |
| Components | shadcn/ui (Radix primitives), `lucide-react` icons, `sonner` toasts |
| Motion | `framer-motion`: slow fades only, nothing bounces |
| Dates | `date-fns` |
| Server | Express (`server/index.ts`), same pattern as the portfolio |
| DB | SQLite via `better-sqlite3` + Drizzle ORM (one local file, easy to wipe and re-seed) |
| Validation | `zod` (shared between client and server in `/shared`) |
| Package manager | pnpm |
| Tests | Vitest for deadline and template logic |

Folder layout (mirror the portfolio):
```
client/  src/{components,components/ui,pages,lib,hooks}  index.html
server/  index.ts  routes/  db/{schema.ts,seed.ts}
shared/  types.ts  schemas.ts
```

---

## 2. Design System (copy exactly from the portfolio)

**Source file:** `client/src/index.css` in the portfolio repo. Copy the whole file, then add the app-specific additions below. Name: *Zurich / Bern Design System*.

### Fonts: in `client/index.html`
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@200;300;400;500&family=Cormorant+Garamond:ital,wght@1,300;1,400&display=swap" rel="stylesheet" />
```
- Body and display: **Inter Tight**, weight **300** body, **200** display
- Accent only (page subtitles, empty states): **Cormorant Garamond italic**

### Color tokens: use as-is
```css
@theme {
  --color-plaster: #f8f6f2;   /* page background */
  --color-limestone: #efece6; /* cards */
  --color-sand: #e0dbd2;      /* borders */
  --color-ash: #6f695f;       /* secondary text (AA on plaster) */
  --color-smoke: #5c5850;
  --color-ink: #1d1c1a;       /* primary text */
  --color-navy: #1f2a3c;      /* primary buttons, sidebar */
  --color-camel: #b8926a;
  --color-sandstone: #a9a790;
  --color-sandstone-light: #d9d6c6;
  --color-aare: #3b8a86;      /* hover, "on track" */
  --color-roof: #9a4b32;      /* "overdue" */
  --color-gold: #c49a3a;      /* "due soon" */
  --font-sans: "Inter Tight", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Cormorant Garamond", ui-serif, Georgia, serif;
}
:root { --radius: 0rem; }     /* square corners everywhere */
```

### Reuse these classes unchanged
`.container`, `.eyebrow` (tiny uppercase labels), `.display`, `.btn-solid` (navy → aare on hover), `.btn-line`, `.link-quiet`, `.stone-card`, `.field` (underline-only inputs), `.animate-fade-in-up`, the `body::before` plaster grain, `::selection`, and the `prefers-reduced-motion` block.

### App-specific additions (add to `index.css`)
```css
/* Status system — color is never the only signal; always pair with a text label + icon */
.status-overdue  { border-left: 3px solid var(--color-roof);  }
.status-soon     { border-left: 3px solid var(--color-gold);  }  /* ≤ 7 days */
.status-ok       { border-left: 3px solid var(--color-aare);  }
.status-stale    { border-left: 3px solid var(--color-camel); }  /* > 1 yr untouched */
.badge { font-size: .68rem; letter-spacing: .18em; text-transform: uppercase;
         padding: .25rem .5rem; border: 1px solid currentColor; }
.badge-overdue { color: var(--color-roof); }
.badge-soon    { color: #8a6a1f; }  /* darkened gold so text passes AA */
.badge-ok      { color: var(--color-aare); }
/* Dense data app: soften grain so tables stay crisp */
body::before { opacity: .12; }
/* Tables */
.data-row { border-bottom: 1px solid var(--color-sand); }
.data-row:hover { background: #e8e2d7; }
```

### Rules
- No rounded corners, no drop shadows, no gradients. Hierarchy comes from type weight, whitespace, and 1px sand borders.
- Section headers: `.eyebrow` label above a `.display` title (same as portfolio `SectionHeader.tsx`, so copy that component).
- Layout: left sidebar in navy with plaster text; main area on plaster; cards on limestone.
- Every status uses **text label + icon + color**, never color alone.
- Check WCAG AA contrast on every text color. Gold text on plaster fails, so use `.badge-soon`.

---

## 3. Data Model (`server/db/schema.ts`)

```
users        id, name, role (attorney | paralegal | file_clerk | admin), initials
cases        id, caption, cause_no, client_name (FAKE), case_type, status
             (inquiry | consult | active | referred_out | closed),
             referred_to (nullable), lead_attorney_id, opened_at,
             last_touched_at, last_touched_by
deadlines    id, case_id, title, kind (court_ordered | statutory | internal | rule_11),
             due_date, source_note, assigned_to, done_at
deadline_changes  id, deadline_id, old_date, new_date, reason, changed_by, changed_at
tasks        id, case_id, parent_task_id (nullable → subtasks), title, assigned_to,
             due_date, scheduled_block (date + start/end, nullable), priority (1–3),
             status (open | done), template_id (nullable)
task_templates  id, name, subtasks JSON [{title, offset_days_before_due}]
activity     id, case_id, user_id, action, detail, created_at
             (every create/update/complete writes a row here, which gives "who last touched it")
call_logs    id, case_id, user_id, direction (in | out), with_whom, summary, follow_up_needed, created_at
notes        id, case_id, task_id (nullable), user_id, body, created_at
```

**Seed data (`seed.ts`):** 5 users matching the real roles but with fake names. 25 cases: 15 active, 6 inquiries (2 referred out, e.g. probate or immigration), 4 closed. Include **3 cases untouched for over 1 year**, **4 overdue deadlines**, and a deadline on **day 15–21** (the "third-week Monday" case). Add 1 deadline that was moved by a Rule 11 agreement, with its history. Every name, cause number, and fact must be obviously fictional.

---

## 4. Build Phases

Each phase ends with a **checkpoint**: run the app, take screenshots, stop, and wait for Vivi's OK.

### Phase 0: Scaffold + design system (≈ 45 min)
1. Scaffold Vite + React + TS + Tailwind v4 + shadcn with the folder layout above.
2. Copy portfolio `index.css`, fonts, `SectionHeader.tsx`, and needed `components/ui/*`. Add the app-specific CSS.
3. Build `AppShell`: navy sidebar (Dashboard, Today, Calendar, Cases, Templates, Team & Access) plus the top bar showing the current user.
4. Add a `/styleguide` page that renders every token, button, badge, status row, and field.
- **Done when:** `/styleguide` looks like the portfolio (same fonts, colors, square corners, grain) and `pnpm check` passes.

### Phase 1: Data + access gate (≈ 1.5 hr)
1. Drizzle schema, migrations, `seed.ts`, and a `pnpm db:reset` script.
2. REST routes: `GET/POST/PATCH` for cases, deadlines, tasks, call_logs, notes, templates. Every write inserts an `activity` row and updates `cases.last_touched_*`. *(Exception, decided in Phase 5: moving a task on your own day planner is personal planning, so it writes no activity and does not count as touching the case. Otherwise "Plan my day" would make stale cases look active.)*
3. **Proprietary acknowledgment screen** on first load. It says the info is proprietary and privileged and must stay inside the firm. The user must click "I acknowledge" (stored per session). Then a **role/user picker** replaces real login for the MVP.
4. Add a persistent footer banner: "Prototype — demo data only."
- **Done when:** the app boots through the gate, the picker sets the user, and the API returns seeded data.

### Phase 2: Dashboard (≈ 2 hr) ← **highest priority screen**
1. **Metric row** (4 stone-cards): Total cases · Active cases · Overdue tasks · Open tasks.
2. **3-week deadline strip:** 21 columns grouped by week (Week 1 / 2 / 3 labels), weekends shaded. Each deadline is a chip with a status class. **Week 3 must always be visible without scrolling on a 1280px screen.**
3. **Countdown list:** next 10 deadlines sorted by date with "in N days" / "N days overdue" and badges.
4. **Stale cases warning:** active cases with `last_touched_at` over 365 days ago, shown with camel status and a "Last touched by X on date" line.
5. **This month pending:** all open tasks and deadlines for the current calendar month, grouped by case.
6. Clicking any item opens a **side drawer** with its notes, activity, and quick "Add note."
- **Done when:** seeded overdue, stale, and week-3 items all appear, and the drawer opens.

### Phase 3: Case detail + logs (≈ 2 hr)
1. **Cases list** with tabs: Active · Intake list (inquiry/consult) · Referred out · Closed. Filters: attorney, type, stale. Sort by last touched.
2. **Case page** header: caption, cause no., lead attorney, status, and "Last touched by [name] · [action] · [time ago]."
3. Sections: Deadlines (with change history shown inline, e.g. "moved from 10/2 → 10/16 · Rule 11 agreement") · Tasks (expandable subtasks) · **Call log** · Notes · Activity timeline.
4. **Quick "Log a call" button**, reachable from anywhere (sidebar plus keyboard shortcut `C`): pick case, in/out, with whom, summary, follow-up checkbox. If follow-up is checked, it auto-creates a task.
5. **Edit deadline date** requires a reason (dropdown incl. "Rule 11 agreement", "Court order", "Other") and writes to `deadline_changes`.
6. *(Added after Phase 3 review)* The call log also captures **key points**, **action items** (each can become a task for the caller, due next business day) and an optional **pasted transcript**. A **"Simulate incoming call"** practice pop-up (fake numbers, demo cases) lets testers try an Answer → End call → pre-filled log flow. It is clearly labeled as simulated: no phone is connected.
- **Done when:** logging a call on case A updates its "last touched" line and shows on the dashboard drawer.

### Phase 4: Today view + task templates (≈ 2.5 hr)
1. **Today** page, left half: prioritized to-do (overdue first, then due today, then priority). Right half: time-block day planner (8 am–6 pm, 30-min slots). *(From paralegal staff: official clock-out is 5 pm and nobody stays past 6 pm. "Plan my day" stops at 5 pm; the 5–6 pm hour is shaded "Staying late" and can be planned by hand.)*. Drag a task into a slot to set `scheduled_block`.
2. **Templates page:** CRUD for task templates. Seed these starter templates (staff will refine them):
   - *MSJ Reply*: pull and label exhibits (A, B, C…), check in with attorney on progress, draft reply, cite-check every authority, final review, file.
   - *Motion to Compel*: review discovery responses for objections/omissions, draft motion, cite-check, attorney review, file.
   - *Deposition Outline*: gather petition/answer/discovery/client docs, draft outline, attorney review.
   - *Default Judgment*, *Answer to Petition*: placeholder subtasks, marked "needs staff input."
3. Creating a task from a template auto-creates the subtasks with due dates offset from the parent due date. *(Decided: a subtask that lands on a weekend moves to the Friday before. Staff can edit any date.)*
4. Add a **"cite-check" subtask to every drafting template by default**. Firm policy: nothing reaches an attorney without it.
- **Done when:** creating "MSJ Reply" due in 10 days creates all subtasks with correct dates (Vitest covers the offset math).

### Phase 5: Calendar + delegation + access view (≈ 2 hr)
1. **Calendar:** 3-week grid by default (toggle 1 / 3 / month). Filter by person. Deadlines and scheduled tasks are both shown. *(The 3-week view always runs through today + 20 days, padded to whole Mon–Sun weeks, so the third-week Monday is never cut off.)*
2. **Delegation:** assign or reassign any task/deadline, and set an individual due date. "My work" filter across all pages.
3. **Team & Access** page: read-only matrix of role × permission (view cases, edit deadlines, delete, manage templates, admin). Mark each item "proposed, confirm with Jesse/Tomas." *(Decided later: renamed "App permissions" so it's clear it means permissions inside this app, and shown only to the IT admin to keep everyone else's sidebar simple. Hiding it is not security; real sign-in comes in v2.)*
4. In-app **reminder banner** on load: "You have N deadlines in the next 7 days, M overdue." No email or push in the MVP.
- **Done when:** reassigning a task moves it between users' "My work" lists and writes activity.

### Phase 6: Polish + test handoff (≈ 1.5 hr)
1. Empty, loading, and error states (Cormorant italic for empty-state lines).
2. Keyboard: `C` log call, `N` new task, `/` search cases.
3. Responsive down to 1024px (office desktops). Mobile is not required.
4. Accessibility pass: focus rings, AA contrast, labels on every field, `prefers-reduced-motion`.
5. Add a `README.md` with a one-command start (`pnpm i && pnpm db:reset && pnpm dev`) and a **"Paralegal test script"** (below).
6. **Verification:** Run through the test script yourself in the browser, screenshot each step, and fix anything broken before handing off. *(Found in the run-through: a deadline could be moved to a Sunday without notice. Added a non-blocking "that's a Sunday" heads-up; dates are still never moved automatically.)*

**Total estimate: ~12 hours of Claude Code build time across 7 sessions.**

---

## 5. Paralegal Test Script (put in README)

Give each tester 20 minutes. They work through these 6 tasks and say one sentence each about what felt wrong:
1. "What's due in the next three weeks? Is anything due on the third Monday?"
2. "Which cases haven't been touched in over a year?"
3. "A client just called on [case]. Log it and flag a follow-up."
4. "Opposing counsel agreed to push a deadline (Rule 11). Move it."
5. "Start an MSJ reply due in 10 days. Are the subtasks right? What's missing?"
6. "Plan your day. Block 2 hours to draft."

Collect answers to: *What would you use tomorrow? What's missing? What would you remove?*

---

## 6. Out of Scope for MVP (parked for v2, needs Jesse/Tomas)

| Item | Why parked |
|---|---|
| Firm server / file-system sync | Needs IT access and a security review for privilege |
| Outlook → case email linking, Clio time entries | Jesse must configure integrations |
| Claude-powered intake (email or order → auto-deadlines) | Needs Enterprise security review. Also, deadline rules must be attorney-verified, not AI-guessed |
| Automatic court-rule deadline calculation | Legal accuracy risk. MVP deadlines are entered by staff |
| Claude usage-limit / character-limit helper | Separate tool. Get the exact limits from Joseph first |
| Real auth (SSO/passwords), hosting, backups | Decide after the pilot |
| Email/Teams notifications | Staff ignore Microsoft reminders today, so in-app first |
| Real phone integration: incoming-call pop-up with caller ID, answer in the browser | The firm has older office phones. Ask Jesse what the system is (plain phone lines, an office phone system with brand/model, or already internet-based). Full version needs an internet (VoIP) phone service, usually keeping the same number and a monthly per-user fee. Plain lines could instead get a caller-ID device for a pop-up only (no answering or recording). |
| Call recording, automatic transcripts, AI key points and action items | Needs a recording (VoIP only), Tomas's sign-off on recording consent (laws differ by state; some require everyone on the call to agree), and a security review before privileged audio goes to any outside transcription or AI service |

---

## 7. Guardrails for Claude Code

- **Never** add real client names, case facts, or anything from the meeting notes' case updates to seed data or code.
- Keep every deadline and legal-rule value **user-entered and editable**. Do not hardcode court-rule calculations.
- Keep the design system tokens exactly as listed. Don't introduce new colors, radii, or shadows.
- After each phase: run `pnpm check`, run tests, start the app, screenshot the new screens, and **stop for review**.
- Commit at the end of each phase with a message like `phase 2: dashboard`.
