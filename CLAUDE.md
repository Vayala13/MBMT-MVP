# MBMT Case Tracker

Prototype case tracker for the MBMT paralegal team: what's due in the next 3 weeks, what's overdue, what's stale, and who touched what last. `PLAN.md` has the original phases and every decision; `README.md` has run steps and the paralegal test script.

## How the owner likes answers

- Plain, non-technical language. Explain terms with everyday comparisons.
- ADHD-friendly: lead with the action, number the steps, give time estimates in minutes, restate progress, end with one next step under 2 minutes. No preamble or closers.
- Cite scholarly sources only.
- Work one step at a time and wait for the owner's OK before starting the next phase or a bigger change.

## Current progress (updated 2026-09-30)

- **All 6 phases of PLAN.md are built** and merged into `main` ([Vayala13/MBMT-MVP#1](https://github.com/Vayala13/MBMT-MVP/pull/1)).
- **Live demo:** https://mbmt-mvp.onrender.com (Render free plan). Build `pnpm i && pnpm build`, start `pnpm start`. Sleeps after 15 min idle (about 1 min to wake). The SQLite file resets on every restart; the server seeds demo data into an empty database on boot.
- **Checks at last merge:** `pnpm check` clean, 127/127 unit tests, 123 browser checks (Playwright), axe audit 0 violations on 15 screens, production build verified.
- **Owner's Mac:** a ZIP copy in `~/Downloads/MBMT-MVP-claude-great-ptolemy-208h7n` (not a git clone, so edits there don't reach GitHub). Node 24 (Homebrew Node unlinked), pnpm 12 auto-switches to the pinned 10.33.0.

## Architecture

- **Stack:** Vite + React 19 + TypeScript, Tailwind v4 (`@theme` tokens), shadcn/ui (Radix), lucide-react, sonner, wouter, date-fns; Express; SQLite via better-sqlite3 + Drizzle; zod; Vitest; pnpm.
- **One server, one port (3000):** in dev, Express runs Vite as middleware; in production it serves the built client from `dist/public`. Entry: `server/index.ts`, routes in `server/routes/`.
- **`shared/` holds the rules** used by both client and server, each with tests: `dates` (next business day, weekend warning), `templates` (subtask dates, weekend→Friday, cite-check), `today` (to-do sort, planner, auto-plan), `dashboard` (strip, countdown, stale cases, metrics), `calendar`, `status`, `access`, plus `schemas` (zod) and `enums`.
- **Database:** `server/db/schema.ts`, migrations in `server/db/migrations`, demo data in `server/db/seed.ts`, `pnpm db:reset` rebuilds `data/mbmt.db`.
- **Access (prototype only):** an acknowledgment screen (sessionStorage) then a user picker. The client sends the `x-mbmt-user` header; the server requires it for writes. No real sign-in.
- **Every write** logs an activity row and updates the case's "last touched" (exception: moving blocks on your own day planner). The client then calls `announceDataChanged()` so every `useApi` screen refetches.
- `better-sqlite3` ships prebuilt binaries; `pnpm.ignoredBuiltDependencies` skips its native build, so no node-gyp or Xcode is needed.

## Product decisions

- Workday 8 am start, **5 pm clock-out** (auto-plan stops here), 5–6 pm shaded "Staying late" (from paralegal feedback).
- "Plan my day for me" fills gaps of 30+ minutes in to-do priority order; planned blocks can be dragged back to the list.
- Template subtask dates that land on a weekend move to the Friday before. Moving a deadline onto a weekend shows a warning but is allowed. Every deadline move requires a reason and is kept in history.
- Calls: key points, action items (optionally turned into tasks due the next business day), pasted transcript. "Simulate incoming call" is practice only; real phone integration is parked.
- 3-week views cover today + 20 days, padded to whole Mon–Sun weeks so week 3 is always visible.
- Design: Zurich/Bern tokens from the owner's portfolio (see `/styleguide`). Square corners, no shadows, AA contrast, status shown as text + icon + color.

## Guardrails

- Demo data only. Never add real client names, cause numbers or case facts (attorney-client privilege).
- Deadline and court-rule values stay user-entered. No hard-coded rule calculations.
- Never commit `.env` files or `data/` (both git-ignored).
- Work on a branch and merge into `main` through a pull request, only when the owner asks. Run `pnpm check` and `pnpm test` before every push.
- Render deploys the live demo automatically when its branch changes, so a bad push breaks the link the owner shares in applications.

## Commands

- `pnpm i && pnpm db:reset && pnpm dev`: install, load demo data, run on http://localhost:3000
- `pnpm check`: TypeScript check
- `pnpm test`: unit tests (Vitest)
- `pnpm build && pnpm start`: production build, same as Render
- `pnpm db:generate`: new migration after editing `server/db/schema.ts`

## Next steps

1. Point Render at `main` (Settings → Build & Deploy → Branch), since the feature branch was deleted after the merge.
2. Share the live link with the owner's teammate; run remote paralegal test sessions (screen-share + the README test script, `pnpm db:reset` before each tester).
3. Collect feedback, then pick from the v2 items parked in PLAN.md: real sign-in, persistent hosting, phone integration, Outlook/Clio, AI features.
4. Optional ideas discussed: a custom domain on Render; rebuilding the data layer to run in the browser so it can live on GitHub Pages (about 3–4 hours).
