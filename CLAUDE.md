@AGENTS.md
@PLAN.md

# Momentum — Project Intelligence File

Single source of truth. Read before writing any code.

---

## What this app is

**Momentum** is a _Project Execution OS_. User drops a raw idea → AI builds a structured plan → app holds them accountable until it ships. Core: anti-procrastination pressure, streaks, next-action focus.

---

## Current phase status

| Phase | Name                                   | Status  |
| ----- | -------------------------------------- | ------- |
| 1     | Foundation & Design System             | ✅ Done |
| 2     | Data Layer & State                     | ✅ Done |
| 3     | Core Pages & AI Intake                 | ✅ Done |
| 4     | Execution Mode & Pressure              | ✅ Done |
| 5     | Completion, Postmortem, Polish         | ✅ Done |
| 6     | Auth, DB, AI Integration               | ✅ Done |
| 7     | i18n, Model Picker, PDF Export         | ✅ Done |
| 8     | Puter.js, Anon Limit, Import           | ✅ Done |
| 9     | Nav Fix, Toast, Feedback & Admin       | ✅ Done |
| 10    | Bug Fixes: Ghost, AI, Store            | ✅ Done |
| 11    | Parser Auto-Repair, Edit Detection, UX | ✅ Done |
| 12    | Production Hardening (14 fixes)        | ✅ Done |

---

## Phase 11 — Parser Auto-Repair, Edit Detection, StepClarify Polish

**Status: ✅ Done**

### What was fixed / added

#### `lib/ai/parser.js` — Auto-repair invalid JSON

- Added `repairJSON()` function that handles the most common LLM output failures **before throwing**: trailing commas, unclosed brackets/strings, single-quoted strings, truncated responses.
- Counts open braces character-by-character and appends correct closing brackets.
- `parseClarifyQuestions` has a regex fallback that extracts `question`/`placeholder` pairs even when `JSON.parse` completely fails.
- Task objects (`[{title: "..."}]` instead of `["..."]`) are now accepted — the parser handles both shapes.
- Blocker objects with a missing `description` field are filtered rather than crashing.
- **No regeneration triggered on repair — zero extra API cost.**

#### `app/new/page.jsx` — Edit detection with explicit permission

- Blueprint key now tracks `idea + scopeLevel + clarifyAnswers` together (previously only `idea + scopeLevel`).
- When inputs change after a blueprint is generated and the user navigates to Step 3 (Review), a `RegenPermissionBanner` appears with two clear choices: **"Regenerate plan ↺"** or **"Keep current plan"**.
- Choosing "Keep" stamps the current inputs as accepted — banner won't reappear.
- A compact `✏️ Edited` badge shows in the breadcrumb on other steps.
- **No surprise regenerations** — user is always in control.

#### `components/intake/StepClarify.jsx` — Polish

- Ghost is simpler and more reliable: matches typed prefix against `q.placeholder` only (no complex rule system).
- Native placeholder hidden while ghost is showing — no text overlap.
- Enter key advances focus to the next question; on the last question it submits if all are filled.
- Loading skeleton has staggered animation delays.
- Error state has a proper Retry / Skip split with distinct styles.
- CTA button label changes to `"Answer all (2/3)"` when not all are filled.

---

## Phase 12 — Production Hardening (14 fixes)

**Status: ✅ Done**

### Files changed and what was fixed

#### `lib/ai/clientGenerate.js`

- Added `"use client"` directive at the top — **required**, prevents Next.js bundling this into server paths.
- Puter is now imported **lazily** via `await import("./puter")` inside a `getPuterModule()` helper instead of at module level. Module graph never pulls `window` access into SSR.
- Synchronous `checkPuterAvailable()` (reads `window.puter` set by CDN, not the module) used for the fast path check.

#### `lib/Notifications.js`

- **Removed** `"use client"` directive — this is a utility module, not a component.
- All functions already guard `typeof window` themselves. The directive was causing Next.js to treat it as a client boundary and risked crashes when imported transitively.

#### `lib/store/projectStore.js` — three fixes

1. **`hydrateFromServer` `finally` block**: `toast.dismiss(syncId)` and `s.hydrated = true` are now in a `finally` block — they execute even on early return (DB unavailable) or on throw. The loading toast can never get permanently stuck.
2. **`completeProject` stale snapshot**: Postmortem stats snapshot is now captured **inside** the Immer `set()` callback (where draft values are final) instead of in a subsequent `get()` call. Eliminates the race between Immer commit and the snapshot read. The captured object is used directly for the remote PATCH.
3. **`debouncedRemoteUpdate` silent errors**: Tracks consecutive failures per project ID in a `failureCount` Map. After 3 consecutive failures shows a single `toast.warn` ("Changes saved locally but not syncing to cloud"). Does not spam on every keystroke. Resets counter on success.

#### `components/intake/StepReview.jsx`

- **`handleRetry` now resets `hasStarted.current`**: Previously only `retryCount.current` was reset. Leaving `hasStarted.current = true` meant the `useEffect` gate was permanently closed — back-navigating after an error and returning to the step produced a blank screen with no generation starting ever again.
- Pattern: reset `hasStarted.current = false`, then immediately set to `true`, then call `runGeneration()` directly (bypassing the effect gate).
- **Progress bar reaches 100%**: `setCharCount(Infinity)` is called after the stream completes, with a 300ms delay before transitioning to the "done" UI. Users see the bar complete instead of jumping from 98% to disappearing.

#### `app/project/[id]/export/route.js`

- **Swapped `connectDB()` → `tryConnectDB()`**: Export route was the only API route still using the throwing version. A DB blip during export now gracefully falls through to the base64 client data instead of returning a 500.
- **500KB payload cap**: Base64 `data` query parameter is checked against `MAX_PAYLOAD_BYTES = 500 * 1024` before decoding. Oversized payloads return 413.

#### `app/api/export-email/route.js`

- **Production 503 when `RESEND_API_KEY` is absent**: Added `const isDev = process.env.NODE_ENV !== "production"`. In dev: still returns the friendly 200 dev-mode message. In production with a missing key: returns 503 with a user-facing message suggesting PDF or Markdown export. No more silent false successes that show a toast but send no email.

#### `app/api/generate/route.js`

- **`x-ratelimit-*` response headers**: All responses now include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. Clients can self-throttle even when in-memory cold-start resets the counter.
- **Cold-start documented**: Comment at top of file explicitly states the `ipUsage` Map resets on cold start and why this is acceptable for MVP. Future path: Redis/Upstash.
- `checkRateLimit` returns `remaining` and `reset` values, threaded through to all response paths.

#### `lib/ai/puter.js`

- **`PUTER_LOAD_TIMEOUT`: 5000ms → 2000ms** — fail fast to API fallback instead of making user wait 5s.
- **`PUTER_POLL_INTERVAL`: 150ms → 50ms** — detect puter availability ~3x faster when it is loaded; hit the timeout ~3x faster when it isn't.

#### `components/intake/StepClarify.jsx`

- **`hasFetched` ref remount fix**: The ref was local to component instance — on unmount/remount (back-nav, React Strict Mode) it reset to `false` and re-fetched even when `cachedQuestions` was populated.
- **Fix**: Initial state now derived from `cachedQuestions` prop directly. `loading` starts as `false` when `cachedQuestions` is non-null. `useEffect` only triggers fetch when `cachedQuestions === null` on mount. A second `useEffect` syncs if the parent provides questions after initial render. The parent's `onQuestionsLoaded` cache is the source of truth across remounts.

#### `app/project/[id]/page.jsx`

- **Replaced both `confirm()` dialogs** (delete + complete) with a `ConfirmModal` component built on the existing `Modal` from the design system.
- `ConfirmModal` shows project name in the description, has a spinner on the confirm button while the async operation runs, uses semantic variants (`danger` for delete, `emerald` for complete).
- Single `confirmModal` state object `{ open, type, loading }` drives both actions. No more main-thread blocking, no more iframe/PWA breakage.

---

## Ghost Writing Rules (canonical)

### StepCapture

- Ghost matches typed prefix against the `EXAMPLES` array (case-insensitive).
- Returns `example.slice(value.length)` when `example.toLowerCase().startsWith(value.toLowerCase())`.
- If no example starts with the typed text, ghost is empty.
- Tab or → accepts the full ghost. Ghost cleared on blur or no match.

### StepClarify

- Ghost matches typed prefix against `q.placeholder` (the AI-generated example answer for that question).
- Returns `placeholder.slice(value.length)` when placeholder starts with the typed text.
- Native placeholder hidden while ghost is showing — no text overlap.
- Tab or → accepts. ✕ button dismisses. Esc clears.
- Enter advances focus to next question; submits on last if all filled.

---

## AI Architecture — CRITICAL

### Two-tier AI system

| Scope     | Provider         | Location        | Cost         |
| --------- | ---------------- | --------------- | ------------ |
| lean      | puter.js         | **client-side** | Free ∞       |
| standard  | puter.js         | **client-side** | Free ∞       |
| ambitious | OpenRouter (API) | **server-side** | Rate limited |

**Puter.js is a browser SDK — it CANNOT run in Next.js API routes.**
All puter calls happen in `lib/ai/clientGenerate.js` (client-only, `"use client"` at top).

### Stream type contract

Both puter and the API route return `ReadableStream<Uint8Array>`.

- `puterStream()` in `lib/ai/puter.js`: gets full text, emits as chunked `ReadableStream` via `TextEncoder`.
- `POST /api/generate` body: `ReadableStream<Uint8Array>` from the fetch Response.

StepReview's reader loop decodes with:

```js
value instanceof Uint8Array
  ? decoder.decode(value, { stream: true })
  : String(value);
```

### Entry point: `lib/ai/clientGenerate.js`

- **`"use client"` required at top** — hard boundary against server bundling.
- Puter imported **lazily** via `await import("./puter")` — module graph safe.
- `checkPuterAvailable()` is synchronous (reads `window.puter`, not the module).
- `generateBlueprint()` → puter for lean/standard, API route for ambitious or puter failure.
- `generateClarifyQuestions()` → puter first, API fallback.
- `generateReengage()` → puter first, API fallback.

### `lib/ai/puter.js`

- `PUTER_LOAD_TIMEOUT = 2000ms` (was 5000) — fail fast.
- `PUTER_POLL_INTERVAL = 50ms` (was 150) — detect readiness faster.
- `puterGenerate(prompt)` — non-streaming, returns string.
- `puterStream(system, user)` — simulates streaming via chunked ReadableStream.
- `isPuterAvailable()` — synchronous check of `window.puter?.ai?.chat`.

### `app/api/generate/route.js`

Only called for: ambitious scope OR puter failure fallback.

**Rate limiter note**: In-memory `ipUsage` Map resets on Vercel cold start. This is acceptable for MVP — the client-side `rateLimit.js` is the primary UX guard. `X-RateLimit-*` headers are returned on every response so clients can self-throttle. For hard server-side enforcement at scale: migrate to Redis/Upstash.

### `app/layout.js`

```html
<script src="https://js.puter.com/v2/" defer />
```

ONLY way puter is loaded. Do not import as a module.

---

## JSON Auto-Repair — CRITICAL

`lib/ai/parser.js` attempts auto-repair before throwing. The `repairJSON()` function handles:

1. Markdown fence stripping (`\`\`\`json`)
2. Outer `{...}` extraction
3. Trailing commas before `]` or `}`
4. Unclosed strings (appends `"`)
5. Unclosed arrays/objects (counts open brackets, appends closers)
6. Single-quoted strings → double-quoted

If repair succeeds, the blueprint is parsed normally — **no regeneration, no extra API call**.
If repair fails, a clear error is thrown for the UI retry flow.

`parseClarifyQuestions` has an additional regex fallback that extracts `question`/`placeholder` pairs even when `JSON.parse` completely fails on the repaired string.

---

## Edit Detection (Wizard) — CRITICAL

`app/new/page.jsx` tracks `inputKey = idea + "||" + scopeLevel + "||" + JSON.stringify(clarifyAnswers)`.

When a blueprint exists and `inputKey !== blueprintKey`:

- `blueprintIsStale = true`
- On Step 3 (Review): `RegenPermissionBanner` renders above `StepReview`.
- User must explicitly choose **"Regenerate"** or **"Keep current plan"**.
- "Keep" stamps `blueprintKey = inputKey` — banner won't reappear.
- "Regenerate" nulls `blueprint` and `blueprintKey` — StepReview starts fresh generation.
- Breadcrumb shows `✏️ Edited` badge on other steps when stale.

**Never silently regenerate.** The user is always in control.

---

## Anonymous project limit — CRITICAL

### Rule: 1 project per anonymous session.

**Server-side enforcement** — client checks are UX hints only.

Flow:

1. `GET /api/projects/check-limit` — counts MongoDB docs for this sessionId.
2. `lib/ai/useProjectLimit.js` hook — fetches check on mount.
3. `app/new/page.jsx` — shows gate UI if limit exceeded.
4. `StepReview` — receives `limitAllowed` + `limitLoading` props.
5. `POST /api/projects` — saves every new project with `sessionId`.

### On sign-in:

1. `DataProvider` calls `claimAnonymousProjects()` first.
2. `POST /api/projects/claim` bulk-updates sessionId docs → userId.
3. `hydrateFromServer()` merges everything.

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

## Store patterns — CRITICAL

### Immer projectId capture

Always capture IDs **before** the `set()` call. Immer draft proxies are not plain objects.

```js
const project = createProject(data);
const projectId = project.id; // capture BEFORE set()
set((s) => {
  s.projects.push(project);
});
return projectId; // safe
```

### completeProject snapshot

Stats must be captured **inside** the Immer `set()` callback:

```js
set((s) => {
  const p = s.projects.find((x) => x.id === id);
  // ... mutate p ...
  snapshotForRemote = { completionDate: p.completionDate, postmortem: { ... } };
});
// use snapshotForRemote for PATCH — never call get() after set() for this
```

### debouncedRemoteUpdate failure handling

After `FAILURE_TOAST_THRESHOLD = 3` consecutive failures for the same project:

- Shows one `toast.warn` ("Changes saved locally but not syncing to cloud").
- Does not repeat on every subsequent failure.
- Counter resets on success.

### hydrateFromServer

`toast.dismiss(syncId)` and `s.hydrated = true` are in a `finally` block — always execute regardless of early return or throw.

---

## Confirm dialogs — CRITICAL

**Never use `window.confirm()`**. It is blocked in iframes, PWAs, and some mobile browsers.

Use the `ConfirmModal` component in `app/project/[id]/page.jsx` (or extract it to `components/ui/ConfirmModal.jsx` if needed elsewhere):

```jsx
<ConfirmModal
  open={confirmModal.open}
  onClose={closeConfirm}
  onConfirm={handleConfirmAction}
  loading={confirmModal.loading}
  title="Delete project"
  description="This cannot be undone."
  confirmLabel="Delete permanently"
  confirmVariant="danger"
/>
```

---

## Export rules

### `app/project/[id]/export/route.js`

- Uses `tryConnectDB()` (never `connectDB()`) — DB failure falls through to base64 client data.
- Base64 `data` query parameter capped at `MAX_PAYLOAD_BYTES = 500KB`. Returns 413 if exceeded.

### `app/api/export-email/route.js`

- **Dev** (`NODE_ENV !== "production"`): missing `RESEND_API_KEY` returns 200 with a dev-mode note.
- **Production**: missing `RESEND_API_KEY` returns **503** with a user-facing message to use PDF/Markdown instead.

---

## MongoDB: graceful degradation

`tryConnectDB()` returns `null` instead of throwing. DB outage degrades to localStorage-only.

**All API routes must use `tryConnectDB()`.** The only exception is `lib/db/mongoose.js` itself which exposes both versions intentionally.

---

## Server/Client boundary rules

**NEVER** import in server files (`app/api/`, `lib/db/`, `lib/models/`):

- `lib/ai/clientGenerate.js` — `"use client"`, uses dynamic puter import
- `lib/ai/puter.js` — reads `window.puter`
- `lib/ai/rateLimit.js` — uses `localStorage`
- `lib/ai/aiStatus.js` — uses toast (client store)

`lib/Notifications.js` — **no** `"use client"` directive. Pure utility with own `typeof window` guards. Safe to import anywhere.

---

## Rate limiting

### Client-side (`lib/ai/rateLimit.js`)

- Tracks daily usage in `localStorage` by type.
- Anonymous: 1 generate/day. Signed-in: 5/day.
- UX hint only — not a security guarantee.

### Server-side (`app/api/generate/route.js`)

- In-memory `ipUsage` Map, 60s sliding window per IP.
- Resets on cold start (Vercel serverless). Documented intentionally.
- Returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers on every response.
- Future: replace with Redis/Upstash for hard enforcement across instances.

---

## Auth model

Auth is **optional** — every feature works without signing in.

- Anonymous: 1 project limit, sessionId-keyed MongoDB + localStorage.
- Signed-in: unlimited, userId-keyed MongoDB, full sync.
- Admin role: Clerk `publicMetadata.role === "admin"` — grants feedback board admin panel.

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

- **Never reset step state on navigation.**
- **Blueprint cache key** = `idea + "||" + scopeLevel + "||" + JSON.stringify(clarifyAnswers)`.
- **`goTo(n)`** — navigate to any step `≤ maxReached`, no side effects.
- **`advance(n)`** — navigate forward, updates `maxReached`.
- **`StepReview` receives `cachedBlueprint`** when navigating back — skips AI call if key matches.
- **`blueprintIsStale`** shows `RegenPermissionBanner` on Step 3 — user must confirm before regenerating.

---

## Toast rules

- `toast.error(msg)` — always appends "Report this issue →" `/feedback` link.
- `toast.error(msg, { action: { label, onClick } })` — explicit action overrides auto-link.
- `toast.warn(msg, { dedup: true })` — use `dedup` for recurring warnings (e.g. sync failure) to avoid spamming.

---

## Feedback page rules

- `/feedback` is **always public** — no auth, no redirect, no middleware guard.
- Admin only: change status, add team note (Clerk `publicMetadata.role === "admin"`).
- Upvote is idempotent server-side (`$ne sessionId` guard).
- In-memory fallback (`memStore`) when MongoDB unavailable.

---

## What NOT to do

- Do NOT use `lib/ai/openrouter.js` — use `lib/ai/client.js` (server) or `lib/ai/clientGenerate.js` (client).
- Do NOT call puter from API routes.
- Do NOT import puter at module level in `clientGenerate.js` — use `getPuterModule()` lazy import.
- Do NOT omit `"use client"` from `clientGenerate.js`.
- Do NOT add `"use client"` to utility modules like `lib/Notifications.js`.
- Do NOT use `window.confirm()` or `window.alert()` anywhere — use `ConfirmModal`.
- Do NOT use `connectDB()` in API routes — use `tryConnectDB()`.
- Do NOT silently return 200 when a required env key is missing in production.
- Do NOT skip the server-side project limit check.
- Do NOT call `auth.protect()` anywhere.
- Do NOT add new localStorage keys outside `lib/persistence.js`.
- Do NOT reset wizard step state or blueprint on back-navigation.
- Do NOT regenerate blueprint silently — always show `RegenPermissionBanner` and wait for user choice.
- Do NOT read `p.lastActivityAt` after setting it to `now` in streak calc.
- Do NOT return `project.id` from inside an Immer `set()` callback.
- Do NOT capture postmortem stats in `get()` after `set()` — capture inside the Immer callback.
- Do NOT add auth guards to `/feedback` or its API route.

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
NEXT_PUBLIC_PUTER_APP_ID=...
NEXT_PUBLIC_PUTER_AUTH_TOKEN=...
RESEND_API_KEY=...          # required in production for email export (returns 503 if absent)
```

---

## Phase 13 — Post-MVP Backlog

- [ ] Recurring check-ins and deadline reminders (cron / server actions)
- [ ] Timeline / Gantt visualization
- [ ] Dependency mapping between tasks
- [ ] AI weekly status summary generator
- [ ] Notes per phase (rich text — Tiptap or similar)
- [ ] Export to Notion / CSV
- [ ] Team collaboration (shared projects, assigned tasks)
- [ ] Analytics dashboard (completion rate, avg time per phase)
- [ ] Paid tier gating (Stripe) — switch `AI_PROVIDER=anthropic` for premium users
- [ ] Mobile app (React Native or Expo)
- [ ] Redis/Upstash rate limiting for hard cross-instance enforcement
- [ ] Extract `ConfirmModal` to `components/ui/ConfirmModal.jsx` for reuse
- [ ] Model picker in Settings: map `model1/2/3` IDs to real OpenRouter model strings

the keeping user engaged with a toast about what's happening in the back while waiting for the ai response, telling why it's taking so long, or changing ai, we'll have a fallback working response soon, not to worry. untill an ai responds with 200 and starts building. this thing isn't working at all. show the toast one by one, and they'll fade away after 3 seconds.

we need to make the prompt on the language the user has selected. we need to add the bengali language there too. also connect the prompts to the language and engineer them carefully to respond with the exact language properly.
