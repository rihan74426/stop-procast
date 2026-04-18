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

| Phase | Name                           | Status         |
| ----- | ------------------------------ | -------------- |
| 1     | Foundation & Design System     | ⬜ Not started |
| 2     | Data Layer & State             | ⬜ Not started |
| 3     | Core Pages & AI Intake         | ⬜ Not started |
| 4     | Execution Mode & Pressure      | ⬜ Not started |
| 5     | Completion, Postmortem, Polish | ⬜ Not started |

**Status key:** ⬜ Not started · 🔄 In progress · ✅ Done · ❌ Blocked

Update the table above as phases complete.

## Tech stack

- **Framework:** Next.js (App Router) — see AGENTS.md for version notes
- **Styling:** Tailwind CSS v4 + CSS custom properties for design tokens
- **State:** Zustand + Immer + localStorage persistence
- **Motion:** Framer Motion (page transitions, micro-interactions, spring physics)
- **AI:** Anthropic SDK — `claude-sonnet-4-20250514` via `/api/generate` route
- **Drag & drop:** @dnd-kit/core + @dnd-kit/sortable
- **Utilities:** date-fns, uuid, canvas-confetti

### Install command

```bash
npm install framer-motion zustand immer date-fns uuid @dnd-kit/core @dnd-kit/sortable canvas-confetti @anthropic-ai/sdk
```

## Design language

- **Fonts:** Clash Display (headings) + DM Sans (body) via `next/font`
- **Colors:** Ink black `#0C0C0F`, Slate surface, Violet accent `#7F77DD`, Emerald progress `#1D9E75`
- **Dark mode:** Class-based via ThemeContext, persisted to localStorage
- **Motion style:** Spring physics on hovers, staggered reveals on load, shared `layoutId` transitions

Never use Inter, Roboto, or system fonts. Never use purple gradients on white.

## Key architectural rules

1. All project state lives in `lib/store/projectStore.js` (Zustand). No ad hoc useState for data.
2. The full project JSON schema is defined in `lib/schema.js`. Every new field goes there first.
3. AI generation happens only in `app/api/generate/route.js`. No Anthropic calls from client components.
4. Design tokens live in `app/globals.css`. No hardcoded colors or spacing outside of tokens.
5. Every async boundary gets a skeleton loader — never a blank flash.

## File map

See `PLAN.md` for the full file list per phase.
See `SCHEMA.md` for the project data model.
See `AGENTS.md` for Next.js version-specific rules.
