@AGENTS.md
@PLAN.md

# Momentum — Project Intelligence File

Single source of truth for all development. Read before writing any code.

---

## What this app is

**Momentum** is a _Project Execution OS_ — not a task manager.
User drops a raw idea → AI converts it into a structured project contract → app keeps dragging it forward until it ships.
Core differentiator: **anti-procrastination pressure** — streaks, idle warnings, missed milestone alerts, next-action focus.

---

## Current phase status

| Phase | Name                           | Status  |
| ----- | ------------------------------ | ------- |
| 1     | Foundation & Design System     | ✅ Done |
| 2     | Data Layer & State             | ✅ Done |
| 3     | Core Pages & AI Intake         | ✅ Done |
| 4     | Execution Mode & Pressure      | ✅ Done |
| 5     | Completion, Postmortem, Polish | ✅ Done |
| 6     | Auth, DB, AI Integration       | ✅ Done |
| 7     | i18n, Model Picker, PDF Export | ✅ Done |
| 8     | Bug fixes, Caching, Anonymous  | ✅ Done |

---

## Tech stack

| Layer      | Technology                          | Notes                              |
| ---------- | ----------------------------------- | ---------------------------------- |
| Framework  | Next.js 15 (App Router)             |                                    |
| Styling    | Tailwind CSS v4 + CSS custom props  | All tokens in `app/globals.css`    |
| State      | Zustand + Immer                     | Dual-layer persistence             |
| Auth       | Clerk                               | Optional — guests use localStorage |
| Database   | MongoDB via Mongoose                | Free M0 cluster on Atlas           |
| AI         | Abstracted via `lib/ai/client.js`   | Provider not exposed in UI         |
| i18n       | Custom context + translations       | 6 languages: en/es/fr/de/zh/ar     |
| PDF export | jsPDF (client-side, dynamic import) |                                    |
| Motion     | Framer Motion                       |                                    |

---

## AI provider system

**Provider details are hidden from users.** Never mention OpenRouter, model names, or API keys in the UI.
`lib/ai/client.js` is the ONLY file that knows the provider.

### OpenRouter caching (IMPORTANT)

`X-OpenRouter-Cache: true` header is set on all **non-streaming** calls (clarify, reengage).

- Cache hits cost **zero tokens**
- Blueprint generation (streaming) does NOT use cache — each is unique
- This header is already set in `lib/ai/client.js` — do not remove it

### Token budget

- `aiGenerate` (clarify/reengage): `max_tokens: 350`
- `aiStream` (blueprint): `max_tokens: 2500`
- System prompt trimmed to ~400 tokens (was ~800)

### Models via `.env.local`

```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=z-ai/glm-4.5-air:free           # primary
OPENROUTER_MODEL1=meta-llama/llama-3.2-3b-instruct:free  # fallback
NEXT_PUBLIC_APP_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://...
```

---

## MongoDB — Anonymous → Authenticated project flow

**This is the correct flow:**

1. Guest creates a project → saved to MongoDB with `sessionId`, `isAnonymous: true`, `userId: null`
2. Guest signs in → `DataProvider` calls `claimAnonymousProjects()` → `POST /api/projects/claim`
3. Claim route updates all matching `sessionId` documents: sets `userId`, `isAnonymous: false`
4. `hydrateFromServer()` loads the full merged set

### Critical files

- `lib/sessionId.js` — generates/retrieves anonymous session ID from localStorage
- `lib/persistence.js` — `claimAnonymousProjects()` sends sessionId to claim route
- `app/api/projects/claim/route.js` — ✅ **now exists** (was missing)
- `components/providers/DataProvider.jsx` — triggers claim BEFORE hydrate

### SSL / TLS error fix

The `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR` on Windows is caused by IPv6 conflicts.
Fix: `family: 4` in mongoose options forces IPv4. Already set in `lib/db/mongoose.js`.

### Graceful degradation

`tryConnectDB()` (in `lib/db/mongoose.js`) returns `null` instead of throwing.
All API routes use this — MongoDB failure degrades to localStorage-only, never crashes the app.

---

## CRITICAL: Server/Client boundary for AI

❌ WRONG:

```js
// app/api/generate/route.js
import { buildProfileContext } from "@/lib/userProfile"; // crashes if "use client"
```

✅ CORRECT: build profile context on client, send as plain string in POST body.

`lib/userProfile.js` must NEVER have `"use client"`. It's a pure utility.

---

## Auth model

Auth is **optional**. Every feature works without signing in.

- Guests: localStorage + anonymous MongoDB (sessionId-keyed)
- Signed-in: data merged to userId in MongoDB
- Auth gate: shown after blueprint generation in `StepReview` — friendly modal, not a hard block
- Never use `auth.protect()` anywhere

---

## Code conventions

- Components: functional only, PascalCase `.jsx`
- Imports: always `@/` path aliases
- Styles: Tailwind + CSS custom props from `globals.css`. No inline style objects except dynamic values.
- State: read/write only through Zustand actions in `projectStore.js`
- AI calls: only in `app/api/` routes. Never in client components.
- Async: every async component needs `<Suspense>` with skeleton fallback
- DataProvider: every page reading project data must be wrapped

## What NOT to do

- Do NOT call `auth.protect()` — auth is optional
- Do NOT add packages without updating install command here
- Do NOT hardcode colors — use CSS custom properties
- Do NOT call AI from client components
- Do NOT create new localStorage keys outside `lib/persistence.js`
- Do NOT skip skeleton loaders on async boundaries
- Do NOT remove `X-OpenRouter-Cache` header from `aiGenerate` calls
- Do NOT use `lib/ai/openrouter.js` — use `lib/ai/client.js` exclusively

---

## Naming

App is **Momentum** everywhere. "StopProcast" is retired.

- Page title: "Momentum — Finish What You Start"
- Logo: `/public/logo.png`

---

## Key files

| File                                    | Purpose                                       |
| --------------------------------------- | --------------------------------------------- |
| `lib/ai/client.js`                      | Server-only AI wrapper with caching           |
| `lib/ai/prompts.js`                     | Trimmed prompts (~400 token system prompt)    |
| `lib/db/mongoose.js`                    | MongoDB + `tryConnectDB` graceful fallback    |
| `app/api/projects/claim/route.js`       | Claims anonymous projects on login            |
| `lib/sessionId.js`                      | Anonymous session tracking                    |
| `lib/persistence.js`                    | `claimAnonymousProjects()` + all remote calls |
| `components/providers/DataProvider.jsx` | Claims then hydrates on sign-in               |
| `middleware.js`                         | Clerk middleware, all routes public           |

---

## Post-MVP backlog

- [ ] Recurring check-ins / deadline reminders (cron)
- [ ] Timeline / Gantt visualization
- [ ] Task dependency mapping
- [ ] AI weekly status summary
- [ ] Rich text notes per phase (Tiptap)
- [ ] Export to Notion / CSV
- [ ] Team collaboration
- [ ] Analytics dashboard
- [ ] More languages (Japanese, Portuguese, Hindi, Russian)
- [ ] Mobile app (React Native / Expo)
- [ ] Replace in-memory rate limiter with Redis/Upstash for production

the input text auto completion.
The user can auto-complete the example response in the placeholder by pressing the Tab button or something on the phone, or by completing the suggested text by typing. Like when typing similar to the suggestion, it'll appear right beside it. or a side button to complete the suggestion.
the clarify scope didn't appeared.

the navigation is reseting the generated data.
the free user will have a free credit of using ai to generate one project.
to generate more, they'll need to login to save this and come tomorrow.
also improve the building plan ai page with much updates about what the ai is doing.
we can also import projects like we're exporting them.
check if the sync and saving cycle is working fine.
