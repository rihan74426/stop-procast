@AGENTS.md
@PLAN.md

# Momentum — Project Intelligence File

Single source of truth. Read before writing any code.

---

## What this app is

**Momentum** is a _Project Execution OS_. User drops a raw idea → AI builds a structured plan → app holds them accountable until it ships. Core: anti-procrastination pressure, streaks, next-action focus.

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
| 8     | Puter.js, Anon Limit, Import   | ✅ Done |

---

## AI Architecture — CRITICAL

### Two-tier AI system

| Scope     | Provider         | Location        | Cost         |
| --------- | ---------------- | --------------- | ------------ |
| lean      | puter.js         | **client-side** | Free ∞       |
| standard  | puter.js         | **client-side** | Free ∞       |
| ambitious | OpenRouter (API) | **server-side** | Rate limited |

**Puter.js is a browser SDK — it CANNOT run in Next.js API routes.**
All puter calls happen in `lib/ai/clientGenerate.js` (client-only) or component files.

### Entry point: `lib/ai/clientGenerate.js`

- `generateBlueprint()` → puter for lean/standard, API route for ambitious
- `generateClarifyQuestions()` → puter first, API fallback
- `generateReengage()` → puter first, API fallback

### `lib/ai/puter.js`

- `puterGenerate(prompt)` — non-streaming, returns string
- `puterStream(system, user)` — simulates streaming via chunked ReadableStream
- `isPuterAvailable()` — checks `window.puter` global

### `app/api/generate/route.js`

Only called for: ambitious scope OR puter failure fallback. Uses OpenRouter via `lib/ai/client.js`.

### `app/layout.js`

```html
<script src="https://js.puter.com/v2/" async />
```

This is the ONLY way puter is loaded. Do not import it as a module.

---

## Anonymous project limit — CRITICAL

### Rule: 1 project per anonymous session. Cannot be bypassed.

**Enforcement is server-side** — client checks are UX hints only.

Flow:

1. `GET /api/projects/check-limit` — counts MongoDB docs for this sessionId
2. `lib/ai/useProjectLimit.js` hook — fetches the check on mount
3. `app/new/page.jsx` — shows gate UI before wizard even starts if limit exceeded
4. `StepReview` — receives `limitAllowed` + `limitLoading` props, shows gate there too
5. `POST /api/projects` — saves every new project with `sessionId` immediately (anon or authed)

### On sign-in:

1. `DataProvider` calls `claimAnonymousProjects()` first
2. `POST /api/projects/claim` bulk-updates `{ sessionId, userId: null }` → `{ userId }`
3. `hydrateFromServer()` merges everything

### Key files:

- `lib/sessionId.js` — generates persistent anonymous session ID
- `lib/ai/useProjectLimit.js` — React hook, checks limit on mount
- `app/api/projects/check-limit/route.js` — server count query
- `app/api/projects/claim/route.js` — transfers anon → user on login

---

## MongoDB: graceful degradation

`tryConnectDB()` (in `lib/db/mongoose.js`) returns `null` instead of throwing.
All API routes use it — DB outage degrades to localStorage-only, never 500s the client.

SSL fix: `family: 4` in mongoose options forces IPv4, resolves Windows TLS error.

---

## Server/Client boundary rules

**NEVER** import or call in server files (`app/api/`, `lib/db/`, `lib/models/`):

- `puter` — browser SDK only
- `lib/ai/clientGenerate.js` — client only
- `lib/ai/puter.js` — client only
- `lib/ai/rateLimit.js` — client only (localStorage)
- `lib/userProfile.js` — pure utility, no "use client" directive

**NEVER** call OpenRouter directly from client components — always via `lib/ai/clientGenerate.js` which routes through the API.

---

## Auth model

Auth is **optional** — every feature works without signing in.

- Anonymous: 1 project limit, sessionId-keyed MongoDB + localStorage
- Signed-in: unlimited, userId-keyed MongoDB, full sync
- Auth gate: shown after blueprint in StepReview (friendly, not a hard block for commit)
- Project limit gate: hard block on `/new` if limit exceeded — sign up required

---

## Tech stack

| Layer      | Technology                         |
| ---------- | ---------------------------------- |
| Framework  | Next.js 15 (App Router)            |
| Styling    | Tailwind CSS v4 + CSS custom props |
| State      | Zustand + Immer                    |
| Auth       | Clerk (optional)                   |
| Database   | MongoDB via Mongoose               |
| AI Primary | Puter.js (client-side, free)       |
| AI Deep    | OpenRouter via API route           |
| i18n       | Custom context, 6 languages        |
| PDF export | jsPDF (client-side)                |

---

## Import feature

`components/project/ImportProjectModal.jsx` — accepts `.json` exports.
Supports single project objects and the Settings bulk-backup format.
Re-hydrates as fresh project (new ID, tasks reset to todo).
Triggered from Dashboard header Import button.

---

## What NOT to do

- Do NOT use `lib/ai/openrouter.js` — use `lib/ai/client.js` (server) or `lib/ai/clientGenerate.js` (client)
- Do NOT call puter from API routes
- Do NOT skip the server-side limit check — client rateLimit.js is bypassable
- Do NOT call `auth.protect()` anywhere
- Do NOT add new localStorage keys outside `lib/persistence.js`
- Do NOT remove `X-OpenRouter-Cache` header from `aiGenerate` calls in `lib/ai/client.js`

---

## .env.local required keys

```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=           # primary model (e.g. z-ai/glm-4.5-air:free)
OPENROUTER_MODEL1=          # fallback model
NEXT_PUBLIC_APP_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
```

A complaining page. or suggestion
the main page navigation is not working correctly
the
