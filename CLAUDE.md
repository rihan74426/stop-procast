@AGENTS.md
@PLAN.md

# StopProcast — Project Intelligence File

This file is the single source of truth for Claude (and any agent) working on this codebase.
Read it before writing any code. Update it after completing any phase or major decision.

## What this app is

**StopProcast** is a _Project Execution OS_ — not a task manager.

A user drops in a raw idea. The app converts it into a structured project contract via AI,
then keeps dragging it forward until it ships. The core differentiator is
**anti-procrastination pressure**: streaks, idle warnings, missed milestone alerts, and a
"next irreversible action" focus mode.

## Current status

| Phase | Name                           | Status  |
| ----- | ------------------------------ | ------- |
| 1     | Foundation & Design System     | ✅ Done |
| 2     | Data Layer & State             | ✅ Done |
| 3     | Core Pages & AI Intake         | ✅ Done |
| 4     | Execution Mode & Pressure      | ✅ Done |
| 5     | Completion, Postmortem, Polish | ✅ Done |

**MVP is complete.** All source files are generated and ready to run.

## Quick start

```bash
# 1. Install dependencies
npm install framer-motion zustand immer date-fns uuid \
  @dnd-kit/core @dnd-kit/sortable canvas-confetti @anthropic-ai/sdk

# 2. Set your Anthropic API key in .env.local
# ANTHROPIC_API_KEY=sk-ant-api03-...

# 3. Run
npm run dev
```

## Tech stack

- **Framework:** Next.js App Router (v16)
- **Styling:** Tailwind CSS v4 + CSS custom properties for design tokens
- **State:** Zustand + Immer + localStorage persistence
- **Motion:** Framer Motion (page transitions, micro-interactions)
- **AI:** Anthropic SDK — `claude-sonnet-4-20250514` via `/api/generate` and `/api/reengage`
- **Utilities:** date-fns, uuid, canvas-confetti

## Design language

- **Fonts:** Clash Display (headings) + DM Sans (body)
- **Colors:** Ink black `#0C0C0F`, Violet accent `#7F77DD`, Emerald progress `#1D9E75`
- **Dark mode:** Class-based via ThemeContext, persisted to localStorage
- **All tokens:** defined in `app/globals.css` as CSS custom properties

## Architecture rules

1. All project state lives in `lib/store/projectStore.js`. No ad hoc useState for data.
2. The full project schema is in `lib/schema.js`. Add fields there first.
3. AI calls only in `app/api/` route handlers — never from client components.
4. All design tokens in `app/globals.css`. No hardcoded colors.
5. Every async boundary gets a skeleton — never a blank flash.
6. Path alias: `@/` maps to project root (configured in `jsconfig.json`).

## Key files at a glance

| File                                | Purpose                                |
| ----------------------------------- | -------------------------------------- |
| `app/globals.css`                   | All design tokens, dark mode, fonts    |
| `lib/schema.js`                     | Project data model + factory functions |
| `lib/store/projectStore.js`         | All project CRUD + streak logic        |
| `lib/pressure.js`                   | Pressure score algorithm               |
| `lib/ai/prompts.js`                 | All AI prompt templates                |
| `app/api/generate/route.js`         | Streaming blueprint generation         |
| `app/new/page.js`                   | 5-step intake wizard                   |
| `app/project/[id]/page.js`          | Execution hub                          |
| `app/project/[id]/complete/page.js` | Completion ceremony                    |

## Next steps (Post-MVP)

See `PLAN.md` Phase 2+ backlog for the full list. Suggested first additions:

1. Recurring deadline reminders (Next.js server actions + cron)
2. Timeline / Gantt visualization
3. Notes per phase (rich text with Tiptap or similar)
4. Team collaboration (Supabase or Convex for real-time sync)
