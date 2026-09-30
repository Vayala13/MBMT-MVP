# Session handoff

Read this first in a new session, then `README.md` and `PLAN.md`.

## Where things stand

- **All 6 phases of PLAN.md are built**, committed and pushed on branch `claude/great-ptolemy-208h7n` (Phase 6 = commit `7df6740`).
- **Not merged to `main`.** No PR has been opened. Only open one if the owner asks.
- **Live demo:** https://mbmt-mvp.onrender.com (Render, free plan, deploys this branch automatically on every push).
  - Build: `pnpm i && pnpm build` · Start: `pnpm start`
  - Sleeps after 15 min idle (first load about 1 min). SQLite resets to fresh demo data on each restart; the server seeds an empty database on boot.
- **Owner's Mac:** a ZIP copy in `~/Downloads/MBMT-MVP-claude-great-ptolemy-208h7n` (not a git clone, so edits there don't reach GitHub). Node 24, pnpm 12 (auto-switches to 10.33.0). Homebrew Node was unlinked.
- **Checks at hand-off:** 127 unit tests pass, 123 browser checks pass, axe audit 0 violations on 15 screens, production build verified.

## Stack

Vite + React 19 + TypeScript, Tailwind v4, shadcn/ui, Express (Vite runs as middleware in dev, one port 3000), SQLite via better-sqlite3 + Drizzle, zod, date-fns, Vitest, pnpm. `better-sqlite3` ships prebuilt binaries, so `pnpm.ignoredBuiltDependencies` skips its native build (no node-gyp needed).

## Decisions made (details in PLAN.md)

- Workday: 8 am start, **5 pm clock-out** (auto-plan stops here), 5–6 pm shaded "Staying late". From paralegal feedback.
- Template subtask dates that land on a weekend move to the Friday before. Moving a deadline onto a weekend shows a warning but is allowed.
- Calls: key points, action items (optionally turned into tasks), pasted transcript. "Simulate incoming call" is practice only; real phone integration is parked.
- Today: planned blocks can be dragged back to the list; "Plan my day for me" fills gaps of 30+ min in priority order.
- Design: Zurich/Bern tokens from the owner's portfolio; square corners, no shadows, AA contrast, status = text + icon + color.

## Guardrails

- Demo data only. Never add real client names or case facts.
- Keep deadline and court-rule values user-entered (no hard-coded rule math).
- `.env` files and `data/` are git-ignored; keep it that way.
- Develop and push only on `claude/great-ptolemy-208h7n`.

## How the owner likes answers

- Plain, non-technical language; ADHD-friendly (action first, numbered steps, time estimates, one next step under 2 minutes, no preamble).
- Scholarly sources only when citing anything.
- Build one step at a time and wait for their OK before the next.

## Open / next

1. Share the live link with a teammate and run remote paralegal test sessions (screen-share + the README test script).
2. Collect feedback, then decide on v2 items parked in PLAN.md (real sign-in, hosting beyond the free demo, phone, Outlook/Clio, AI features).
3. Optional: open a PR to merge into `main` (only on request).
4. Optional idea discussed: rebuild the data layer to run in the browser so it could live on GitHub Pages (about 3–4 hours).
