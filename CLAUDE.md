@AGENTS.md
@PLAN.md

# Momentum — Project Intelligence File

Single source of truth. Read before writing any code.

---

## What this app is

**Momentum** is a _Project Execution OS_. User drops a raw idea → AI builds a structured plan → app holds them accountable until it ships. Core: anti-procrastination pressure, streaks, next-action focus.

---

## Current phase status

| Phase | Name                             | Status  |
| ----- | -------------------------------- | ------- |
| 1     | Foundation & Design System       | ✅ Done |
| 2     | Data Layer & State               | ✅ Done |
| 3     | Core Pages & AI Intake           | ✅ Done |
| 4     | Execution Mode & Pressure        | ✅ Done |
| 5     | Completion, Postmortem, Polish   | ✅ Done |
| 6     | Auth, DB, AI Integration         | ✅ Done |
| 7     | i18n, Model Picker, PDF Export   | ✅ Done |
| 8     | Puter.js, Anon Limit, Import     | ✅ Done |
| 9     | Nav Fix, Toast, Feedback & Admin | ✅ Done |
| 10    | Bug Fixes: Ghost, AI, Store      | ✅ Done |

---

## Phase 10 — Bug Fixes

**Status: ✅ Done**

### What was fixed

#### `components/intake/StepCapture.jsx` — Ghost rewritten to be example-based

- **Before**: ghost used a complex trigger-word system that generated its own suggestions unrelated to examples.
- **After**: ghost finds the first `EXAMPLE` string that starts with the user's typed prefix and returns the remainder. Typing "Learn conv..." shows the ghost "ersational Spanish in 3 months...". Tab or → accepts. This matches the design intent in CLAUDE.md.
- Removed all `SUGGESTION_RULES` and `DOMAIN_HINTS` — these were generating arbitrary completions.

#### `components/intake/StepClarify.jsx` — Ghost simplified to placeholder-based

- **Before**: `getAnswerGhost` checked semantic rules unrelated to the question.
- **After**: ghost shows the remainder of `q.placeholder` after the user's typed prefix. Clean, predictable, and directly tied to the AI-generated example answer for each question.
- Removed `ANSWER_COMPLETIONS` rule set — was overcomplicated and wrong in intent.

#### `lib/ai/clientGenerate.js` — Routing and stream handling

- **Before**: returned `res.body` for API route (correct) but the comment said streams differed; no clarity on types.
- **After**: both puter and API route return `ReadableStream<Uint8Array>`. Documented explicitly. `generateBlueprint` routing order: puter for lean/standard → API for ambitious or puter failure.

#### `components/intake/StepReview.jsx` — Stream decoder fix

- **Before**: chunk handling with `typeof value === "string"` guard was fragile; `streamPending` ref was out of sync with state.
- **After**: explicit `value instanceof Uint8Array` check → `decoder.decode()`, else string coerce. `streamPending` managed via state only (ref removed — was redundant and caused stale-closure bugs). Retry `hasStarted.current = false` reset is now inside `handleRetry` (was already correct in Phase 9 but consolidate here).

#### `lib/store/projectStore.js` — Immer draft id capture + streak logic

- **Before**: `addProject` did `return project.id` after the `set()` call — in Immer, `project` inside the callback is a draft proxy; reading `.id` outside the callback on the original object is safe but confusing.
- **After**: `const projectId = project.id` captured BEFORE `set()` call, returned after. Unambiguous and safe.
- **Before**: streak logic in `updateTask` read `p.lastActivityAt` AFTER updating it to `now`, always getting today's date.
- **After**: `lastActive` captured before `p.lastActivityAt = now`. Streak now correctly computes based on previous activity date.

---

## Ghost Writing Rules (canonical)

### StepCapture

- Ghost matches typed prefix against the `EXAMPLES` array (case-insensitive).
- Returns `example.slice(value.length)` when `example.toLowerCase().startsWith(value.toLowerCase())`.
- If no example starts with the typed text, ghost is empty.
- Tab or → accepts the full ghost. Ghost is cleared on blur or if no example matches.

### StepClarify

- Ghost matches typed prefix against `q.placeholder` (the AI-generated example answer).
- Returns `placeholder.slice(value.length)` when placeholder starts with the typed text.
- Tab or → accepts. ✕ button dismisses. Esc clears.

---

## AI Architecture — CRITICAL

### Two-tier AI system

| Scope     | Provider         | Location        | Cost         |
| --------- | ---------------- | --------------- | ------------ |
| lean      | puter.js         | **client-side** | Free ∞       |
| standard  | puter.js         | **client-side** | Free ∞       |
| ambitious | OpenRouter (API) | **server-side** | Rate limited |

**Puter.js is a browser SDK — it CANNOT run in Next.js API routes.**
All puter calls happen in `lib/ai/clientGenerate.js` (client-only).

### Stream type contract

Both puter and the API route return `ReadableStream<Uint8Array>`.

- `puterStream()` in `lib/ai/puter.js`: gets full text, emits as chunked `ReadableStream` via `TextEncoder`.
- `POST /api/generate` body: `ReadableStream<Uint8Array>` from the fetch Response.

StepReview's reader loop decodes with: `value instanceof Uint8Array ? decoder.decode(value, { stream: true }) : String(value)`

### Entry point: `lib/ai/clientGenerate.js`

- `generateBlueprint()` → puter for lean/standard, API route for ambitious or puter failure
- `generateClarifyQuestions()` → puter first, API fallback
- `generateReengage()` → puter first, API fallback

### `lib/ai/puter.js`

- `puterGenerate(prompt)` — non-streaming, returns string
- `puterStream(system, user)` — simulates streaming via chunked ReadableStream
- `isPuterAvailable()` — checks `typeof window.puter?.ai?.chat === "function"` (synchronous)

### `app/api/generate/route.js`

Only called for: ambitious scope OR puter failure fallback.

### `app/layout.js`

```html
<script src="https://js.puter.com/v2/" defer />
```

ONLY way puter is loaded. Do not import as a module.

---

## Anonymous project limit — CRITICAL

### Rule: 1 project per anonymous session.

**Server-side enforcement** — client checks are UX hints only.

Flow:

1. `GET /api/projects/check-limit` — counts MongoDB docs for this sessionId
2. `lib/ai/useProjectLimit.js` hook — fetches check on mount
3. `app/new/page.jsx` — shows gate UI if limit exceeded
4. `StepReview` — receives `limitAllowed` + `limitLoading` props
5. `POST /api/projects` — saves every new project with `sessionId`

### On sign-in:

1. `DataProvider` calls `claimAnonymousProjects()` first
2. `POST /api/projects/claim` bulk-updates sessionId docs → userId
3. `hydrateFromServer()` merges everything

---

## Streak calculation (fixed in Phase 10)

In `updateTask`:

```js
const lastActive = p.lastActivityAt?.split("T")[0]; // read BEFORE update
p.lastActivityAt = now; // then update
if (lastActive === today) {
  if (p.streakDays < 1) p.streakDays = 1;
} else if (lastActive === yesterday) {
  p.streakDays += 1;
} else {
  p.streakDays = 1;
}
```

---

## MongoDB: graceful degradation

`tryConnectDB()` returns `null` instead of throwing. DB outage degrades to localStorage-only.

---

## Server/Client boundary rules

**NEVER** import in server files (`app/api/`, `lib/db/`, `lib/models/`):

- `puter` — browser SDK only
- `lib/ai/clientGenerate.js` — client only
- `lib/ai/puter.js` — client only
- `lib/ai/rateLimit.js` — client only (localStorage)

---

## Auth model

Auth is **optional** — every feature works without signing in.

- Anonymous: 1 project limit, sessionId-keyed MongoDB + localStorage
- Signed-in: unlimited, userId-keyed MongoDB, full sync
- Admin role: Clerk `publicMetadata.role === "admin"` — grants feedback board admin panel

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

## Wizard navigation rules

- **Never reset step state on navigation**
- **Blueprint cache key** = `idea + "||" + scopeLevel`
- **`goTo(n)`** — navigate to any step `≤ maxReached`, no side effects
- **`advance(n)`** — navigate forward, updates `maxReached`
- **`StepReview` receives `cachedBlueprint`** when navigating back — skips AI call
- **`blueprintIsStale`** shown as warning badge, does not block navigation

---

## Toast rules

- `toast.error(msg)` — always appends "Report this issue →" `/feedback` link
- `toast.error(msg, { action: { label, onClick } })` — explicit action overrides auto-link

---

## Feedback page rules

- `/feedback` is **always public** — no auth, no redirect, no middleware guard
- Admin only: change status, add team note (Clerk `publicMetadata.role === "admin"`)
- Upvote is idempotent server-side (`$ne sessionId` guard)
- In-memory fallback (`memStore`) when MongoDB unavailable

---

## What NOT to do

- Do NOT use `lib/ai/openrouter.js` — use `lib/ai/client.js` (server) or `lib/ai/clientGenerate.js` (client)
- Do NOT call puter from API routes
- Do NOT skip the server-side limit check
- Do NOT call `auth.protect()` anywhere
- Do NOT add new localStorage keys outside `lib/persistence.js`
- Do NOT reset wizard step state or blueprint on back-navigation
- Do NOT regenerate blueprint when user navigates back to StepReview with unchanged inputs
- Do NOT add auth guards to `/feedback` or its API route
- Do NOT read `p.lastActivityAt` after setting it to `now` in streak calc
- Do NOT return `project.id` from inside an Immer `set()` callback

---

## .env.local required keys

```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=           # primary model
OPENROUTER_MODEL1=          # fallback model
NEXT_PUBLIC_APP_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
```

---

## Phase 11 — Post-MVP Backlog

- [ ] Recurring check-ins and deadline reminders (cron / server actions)
- [ ] Timeline / Gantt visualization
- [ ] Dependency mapping between tasks
- [ ] AI weekly status summary generator
- [ ] Notes per phase (rich text — Tiptap or similar)
- [ ] Export to Notion / CSV / PDF
- [ ] Team collaboration (shared projects, assigned tasks)
- [ ] Analytics dashboard (completion rate, avg time per phase)
- [ ] Paid tier gating (Stripe)
- [ ] Mobile app (React Native or Expo)
