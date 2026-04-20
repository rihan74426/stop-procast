@AGENTS.md
@PLAN.md

# StopProcast — Project Intelligence File

Single source of truth for all development. Read before writing any code.

---

## What this app is

**StopProcast** is a _Project Execution OS_ — not a task manager.

A user drops in a raw idea. The app converts it into a structured project contract via AI,
then keeps dragging it forward until it ships. The core differentiator is
**anti-procrastination pressure**: streaks, idle warnings, missed milestone alerts, and a
"next irreversible action" focus mode.

---

## Current phase status

| Phase | Name                           | Status  |
| ----- | ------------------------------ | ------- |
| 1     | Foundation & Design System     | ✅ Done |
| 2     | Data Layer & State             | ✅ Done |
| 3     | Core Pages & AI Intake         | ✅ Done |
| 4     | Execution Mode & Pressure      | ✅ Done |
| 5     | Completion, Postmortem, Polish | ✅ Done |
| 6     | Auth, DB, OpenRouter           | ✅ Done |

**Status key:** ⬜ Not started · 🔄 In progress · ✅ Done · ❌ Blocked

---

## Tech stack

| Layer       | Technology                                      | Notes                            |
| ----------- | ----------------------------------------------- | -------------------------------- |
| Framework   | Next.js 15 (App Router)                         |                                  |
| Styling     | Tailwind CSS v4 + CSS custom properties         | All tokens in `app/globals.css`  |
| State       | Zustand + Immer                                 | Dual-layer persistence           |
| Auth        | Clerk                                           | Free tier, handles all auth UI   |
| Database    | MongoDB via Mongoose                            | Free M0 cluster on Atlas         |
| AI (active) | OpenRouter — `google/gemini-2.0-flash-exp:free` | Free, swap model in `.env.local` |
| AI (future) | Anthropic Claude (kept in codebase)             | Activate when monetising         |
| Motion      | Framer Motion                                   |                                  |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable               |                                  |
| Confetti    | canvas-confetti                                 | Completion ceremony              |

### Install command (full)

```bash
npm install @clerk/nextjs mongoose framer-motion zustand immer \
  date-fns uuid @dnd-kit/core @dnd-kit/sortable canvas-confetti \
  @anthropic-ai/sdk
```

> No extra AI SDK needed for OpenRouter — it uses plain `fetch`.

---

## AI provider system

The AI layer is **provider-switchable** via a single env var:

```
AI_PROVIDER=openrouter   # default — free via OpenRouter
AI_PROVIDER=anthropic    # paid — direct Anthropic API
```

To change the model used through OpenRouter, update `.env.local`:

```
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free   # free
OPENROUTER_MODEL=anthropic/claude-sonnet-4-5         # paid
OPENROUTER_MODEL=openai/gpt-4o                       # paid
```

Free models on OpenRouter (no credits needed):

- `google/gemini-2.0-flash-exp:free`
- `meta-llama/llama-3.3-70b-instruct:free`
- `mistralai/mistral-7b-instruct:free`
- `deepseek/deepseek-r1:free`

---

## Data persistence

All project data is stored in **two layers**:

1. **localStorage** — instant reads/writes, offline capable, used as a cache
2. **MongoDB** — source of truth, survives across devices and browsers

Flow:

- On app load → read from localStorage instantly (no flash)
- After Clerk auth confirms → fetch from MongoDB and hydrate the store
- On every write → update localStorage immediately + async sync to MongoDB

---

## Architecture rules

1. All project state lives in `lib/store/projectStore.js`. No ad hoc `useState` for data.
2. The full project JSON schema is in `lib/schema.js`. Add fields there first, then `lib/models/Project.js`.
3. AI calls only in `app/api/generate/route.js`. Never call OpenRouter or Anthropic from client components.
4. All design tokens in `app/globals.css`. No hardcoded colors anywhere.
5. Every async boundary gets a skeleton loader — never a blank flash.
6. Path alias: `@/` maps to project root (`jsconfig.json`).
7. Never hardcode `userId` — always read from Clerk `auth()` in API routes.

---

## Key files at a glance

| File                                    | Purpose                                       |
| --------------------------------------- | --------------------------------------------- |
| `.env.local`                            | All secrets — AI key, Clerk keys, MongoDB URI |
| `middleware.js`                         | Clerk route protection                        |
| `app/globals.css`                       | Design tokens, dark mode, fonts               |
| `lib/schema.js`                         | Project data model + factory functions        |
| `lib/models/Project.js`                 | Mongoose schema (MongoDB)                     |
| `lib/db/mongoose.js`                    | MongoDB connection with caching               |
| `lib/ai/openrouter.js`                  | OpenRouter client (streaming + non-streaming) |
| `lib/store/projectStore.js`             | All project CRUD + dual-layer persistence     |
| `lib/persistence.js`                    | localStorage + MongoDB API helpers            |
| `app/api/generate/route.js`             | AI generation — OpenRouter or Anthropic       |
| `app/api/projects/route.js`             | REST: GET all, POST create                    |
| `app/api/projects/[id]/route.js`        | REST: GET, PATCH, DELETE one                  |
| `components/providers/DataProvider.jsx` | Hydrates store from MongoDB post-auth         |

---

## Next steps (Post-MVP backlog)

See `PLAN.md` Phase 7+ for the full list.
