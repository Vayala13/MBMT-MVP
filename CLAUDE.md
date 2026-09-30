# MBMT Case Tracker

Prototype case tracker for the MBMT paralegal team. Read `HANDOFF.md` for where things stand, `PLAN.md` for the phases and decisions, `README.md` for running it.

## How the owner likes answers

- Plain, non-technical language. Explain terms with everyday comparisons.
- ADHD-friendly: lead with the action, number the steps, give time estimates in minutes, restate progress, end with one next step under 2 minutes. No preamble or closers.
- Cite scholarly sources only.
- Work one step at a time and wait for the owner's OK before starting the next phase or a bigger change.

## Guardrails

- Demo data only. Never add real client names, cause numbers or case facts (attorney-client privilege).
- Deadline and court-rule values stay user-entered. No hard-coded rule calculations.
- Never commit `.env` files or `data/` (both git-ignored).
- Develop and push on `claude/great-ptolemy-208h7n`. Don't open a PR or merge into `main` unless asked.
- Every push to that branch redeploys https://mbmt-mvp.onrender.com, so run checks first.
- Keep the Zurich/Bern design tokens (see `/styleguide`): square corners, no shadows, AA contrast, status shown as text + icon + color.

## Commands

- `pnpm i && pnpm db:reset && pnpm dev`: install, load demo data, run on http://localhost:3000
- `pnpm check`: TypeScript check
- `pnpm test`: unit tests (Vitest)
- `pnpm build && pnpm start`: production build, same as Render

## Code rules

- Shared logic (dates, planner, templates, dashboard) lives in `shared/` with tests. Change the rule there, not in a page.
- Every write logs an activity row and updates the case's "last touched" (except moving blocks on your own day planner).
- After a write, the client calls `announceDataChanged()` so every screen refetches.
- New database columns: edit `server/db/schema.ts`, then `pnpm db:generate`.
