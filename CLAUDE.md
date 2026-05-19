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
| 13    | Full i18n, Clarify Toast, Regen Fix    | ✅ Done |

---

## Phase 13 — Full i18n, Clarify Toast, Regen Fix

**Status: ✅ Done**

### What was fixed / added

#### `lib/i18n/translations.js` — Complete key audit

- Added **100+ missing translation keys** covering every visible string in the app.
- New key groups: `next_action_*`, `streak_*`, `blocker_*`, `task_*`, `pressure_*`, `completion_*`, `postmortem_*`, `stats_*`, `confirm_*`, `toast_*`, `wait_*`, `clarify_toast_*`, `blueprint_toast_*`, `regen_*`, `import_*`, `save_prompt_*`, `network_*`, `empty_state_*`, `card_*`, `feedback_*`, `export_email_*`, `common_*`, `intake_commit_*`, `intake_clarify_*`, `intake_review_*`.
- All 7 languages updated: `en`, `bn`, `ar`, `fr`, `es`, `de`, `zh`.
- Bengali (`bn`) — fully translated all new keys.

#### `lib/toastSequence.js` — i18n-aware

- `createToastSequence(context, locale)` now accepts a `locale` parameter.
- Messages resolved from `translations[locale]` at sequence-start time.
- Keys for questions: `clarify_toast_generating/analyzing/crafting/polishing/working`.
- Keys for blueprint: `blueprint_toast_analysing/mapping/defining/writing/blockers/tools/finalising`.
- Falls back to English if locale key missing.

#### `components/intake/StepClarify.jsx` — Toast sequence fixed

- **Was broken**: no toasts fired during question fetch.
- **Fixed**: `createToastSequence("questions", locale)` called at start of `fetchQuestions()`.
- Sequence dismissed with `toastSeqRef.current.success(t("clarify_toast_ready"))` on success.
- Sequence dismissed with `toastSeqRef.current.error(t("clarify_toast_error"))` on failure.
- Toast sequence cleaned up on unmount via `toastSeqRef.current?.unmount()`.
- All UI strings use `t()`: title, desc, loading text, error messages, buttons.

#### `components/intake/StepReview.jsx` — Locale-aware toast sequence

- `createToastSequence("blueprint", locale)` — passes locale from `useI18n()`.
- Progress stage labels use `t(stage.key)` instead of hardcoded English.
- All UI strings translated: limit gate, error state, streaming UI, blueprint display, sign-in nudge.

#### `app/new/page.jsx` — i18n wait sequence + regen fix

- `startWaitSequence(t)` receives `t` function — all 4 wait messages use translation keys.
- `RegenPermissionBanner` receives `t` prop and uses `t("regen_banner_title/desc/regenerate/keep")`.
- `handleRegeneratePlan` now correctly sets `genStatus("streaming")`, resets to step 3, then calls `runGeneration()` — no more blank screen after regen.
- Blueprint key computed inside `runGeneration()` from current `genInputsRef` values — eliminates stale closure issue.
- `tRef` tracks latest `t` function so `runGeneration` always uses current locale's messages.

#### `lib/store/projectStore.js` — i18n toast messages

- `tr(key)` helper reads `momentum_locale` from localStorage (store runs outside React).
- All `toast.*` calls use `tr()` for translated messages.
- `toast_syncing`, `toast_sync_saved`, `toast_sync_offline`, `toast_save_local`, `toast_sync_warn` keys used.

#### `components/ui/NetworkMonitor.jsx` — i18n

- Uses `useI18n()` → `t("network_offline")` and `t("network_online")`.

#### Components fully i18n'd (all strings use `t()`):

- `components/project/NextAction.jsx` — `next_action_*` keys
- `components/project/StreakBanner.jsx` — `streak_*` keys
- `components/project/BlockerPanel.jsx` — `blocker_*` keys
- `components/project/TaskList.jsx` — `task_*` keys
- `components/project/ProjectPressure.jsx` — `pressure_*` keys
- `components/project/EmailExportModal.jsx` — `export_email_*` keys
- `components/completion/Postmortem.jsx` — `postmortem_*` keys
- `components/completion/ProjectStats.jsx` — `stats_*` keys
- `components/dashboard/EmptyState.jsx` — `empty_state_*` keys
- `components/dashboard/ProjectCard.jsx` — `card_*` keys
- `components/ui/SavePromptModal.jsx` — `save_prompt_*` keys
- `components/intake/StepCommit.jsx` — `intake_commit_*` keys
- `app/project/[id]/page.jsx` — confirm modals, export toasts, all labels
- `app/project/[id]/complete/page.jsx` — `completion_*` keys

#### `app/settings/page.jsx` — patch

- `"Notifications"` title → `t("settings_notifications")`
- Hardcoded description → `t("settings_notifications_desc")`

---

## i18n Rules — CRITICAL

### Translation key structure

Keys are `domain_sub_detail`. Never use raw English strings in JSX — always `t("key")`.

### Store-level translations

The Zustand store runs outside React and cannot use `useI18n()`. Use the `tr(key)` helper in `lib/store/projectStore.js` which reads `momentum_locale` from localStorage.

### Toast sequence locale

Always pass `locale` when creating a toast sequence:

```js
const { locale, t } = useI18n();
const seq = createToastSequence("blueprint", locale); // ← locale required
```

### Adding new translations

1. Add the key to `en` first (canonical).
2. Add to all 6 other languages (`bn`, `ar`, `fr`, `es`, `de`, `zh`).
3. Update `CLAUDE.md` with the new key group.
4. Never hard-code visible strings in JSX — always use `t()`.

### Missing key fallback

`t(key)` falls back: `locale dict → en dict → key itself`. So a missing key shows the key name, making it easy to spot.

---

## Clarify Toast Sequence — CRITICAL

`StepClarify` must show a toast sequence while `generateClarifyQuestions()` runs. Pattern:

```js
// Start sequence
toastSeqRef.current = createToastSequence("questions", locale);
toastSeqRef.current.start();

try {
  const text = await generateClarifyQuestions(idea, locale);
  // ...
  toastSeqRef.current?.success(t("clarify_toast_ready"));
  toastSeqRef.current = null;
} catch {
  toastSeqRef.current?.error(t("clarify_toast_error"));
  toastSeqRef.current = null;
}
```

Always clean up on unmount:

```js
useEffect(() => {
  mountedRef.current = true;
  return () => {
    mountedRef.current = false;
    toastSeqRef.current?.unmount();
  };
}, []);
```

---

## Regen Logic — CRITICAL

### Blueprint key

```js
const inputKey = `${idea.trim()}||${scopeLevel}||${JSON.stringify(
  clarifyAnswers
)}`;
const blueprintIsStale =
  blueprint !== null && blueprintKey !== null && inputKey !== blueprintKey;
const showRegenBanner = blueprintIsStale && (step === 2 || step === 3);
```

### handleRegeneratePlan

```js
const handleRegeneratePlan = useCallback(() => {
  retryCountRef.current = 0;
  setBlueprint(null);
  setBlueprintKey(null);
  setGenStatus("streaming");
  setGenCharCount(0);
  setGenError(null);
  setStep(3); // Go to review step
  setMaxReached((prev) => Math.max(prev, 3));
  runGeneration(); // Start generation immediately
}, [runGeneration]);
```

### handleKeepPlan

```js
const handleKeepPlan = useCallback(() => {
  setBlueprintKey(inputKey); // Stamp current inputs as accepted
  toast.success(t("toast_keep_plan"), { duration: 2000 });
}, [inputKey, t]);
```

### Blueprint key stamped inside runGeneration

The key is captured from `genInputsRef.current` **inside** `runGeneration()` after parse succeeds — never from stale closure:

```js
const currentInputKey = `${currentIdea.trim()}||${currentScope}||${JSON.stringify(
  currentAnswers
)}`;
setBlueprintKey(currentInputKey);
```

---

## Wait Sequence — CRITICAL

`startWaitSequence(t)` in `app/new/page.jsx` uses the `t` function:

```js
function startWaitSequence(t) {
  const MESSAGES = [
    { after: 6000, key: "wait_thinking" },
    { after: 15000, key: "wait_switching" },
    { after: 28000, key: "wait_still_working" },
    { after: 42000, key: "wait_almost" },
  ];
  // ...shows one toast at a time, dismissing previous before showing next
}
```

Pass a fresh `tRef.current` so locale changes are reflected:

```js
const tRef = useRef(t);
useEffect(() => {
  tRef.current = t;
}, [t]);
// Inside runGeneration:
stopWaitRef.current = startWaitSequence(tRef.current);
```

---

## Phase 12 — Production Hardening (14 fixes)

[Previous content preserved — see git history]

Key fixes:

- `clientGenerate.js` — `"use client"` + lazy puter import
- `Notifications.js` — removed `"use client"` directive
- `projectStore.js` — `hydrateFromServer` finally block, `completeProject` snapshot inside Immer, `debouncedRemoteUpdate` failure counter
- `StepReview.jsx` — `handleRetry` resets `hasStarted.current`, progress bar reaches 100%
- `export/route.js` — `tryConnectDB()`, 500KB payload cap
- `export-email/route.js` — 503 in production when RESEND_API_KEY absent
- `generate/route.js` — `X-RateLimit-*` headers on all responses
- `puter.js` — PUTER_LOAD_TIMEOUT 2000ms, PUTER_POLL_INTERVAL 50ms
- `StepClarify.jsx` — `hasFetched` ref remount fix
- `project/[id]/page.jsx` — `window.confirm()` → `ConfirmModal`

---

## AI Architecture — CRITICAL

### Two-tier AI system

| Scope     | Provider         | Location        | Cost         |
| --------- | ---------------- | --------------- | ------------ |
| lean      | puter.js         | **client-side** | Free ∞       |
| standard  | puter.js         | **client-side** | Free ∞       |
| ambitious | OpenRouter (API) | **server-side** | Rate limited |

**Puter.js is a browser SDK — it CANNOT run in Next.js API routes.**

### Entry point: `lib/ai/clientGenerate.js`

- `"use client"` required at top.
- Puter imported lazily via `await import("./puter")`.
- `generateBlueprint()` → puter for lean/standard, API route for ambitious or puter failure.
- `generateClarifyQuestions(idea, locale)` → puter first, API fallback.
- `generateReengage(project, locale)` → puter first, API fallback.

---

## Anonymous project limit — CRITICAL

- Anonymous: 1 project per session.
- Server-side enforcement via `POST /api/projects` and `GET /api/projects/check-limit`.
- `useProjectLimit()` hook — fetches check on mount.
- `StepReview` receives `limitAllowed` + `limitLoading` props.

---

## Store patterns — CRITICAL

### Immer projectId capture

Always capture IDs **before** the `set()` call:

```js
const project = createProject(data);
const projectId = project.id; // capture BEFORE set()
set((s) => {
  s.projects.push(project);
});
return projectId;
```

### completeProject snapshot

Stats captured **inside** the Immer `set()` callback, stored in `snapshotForRemote`, used for PATCH after `set()` commits.

---

## Confirm dialogs — CRITICAL

**Never use `window.confirm()`**. Always use `ConfirmModal` from `app/project/[id]/page.jsx`.

---

## MongoDB: graceful degradation

All API routes use `tryConnectDB()` (never `connectDB()`). DB outage degrades to localStorage-only.

---

## Auth model

Auth is **optional** — every feature works without signing in.

- Anonymous: 1 project limit, sessionId-keyed MongoDB + localStorage.
- Signed-in: unlimited, userId-keyed MongoDB, full sync.
- Admin: Clerk `publicMetadata.role === "admin"`.

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
| i18n       | Custom context, 7 languages        |
| PDF export | jsPDF (client-side)                |

---

## What NOT to do

- Do NOT use `lib/ai/openrouter.js` — use `lib/ai/client.js` (server) or `lib/ai/clientGenerate.js` (client).
- Do NOT call puter from API routes.
- Do NOT import puter at module level in `clientGenerate.js`.
- Do NOT omit `"use client"` from `clientGenerate.js`.
- Do NOT add `"use client"` to utility modules like `lib/Notifications.js`.
- Do NOT use `window.confirm()` or `window.alert()` — use `ConfirmModal`.
- Do NOT use `connectDB()` in API routes — use `tryConnectDB()`.
- Do NOT hard-code visible strings in JSX — always use `t("key")`.
- Do NOT call `createToastSequence()` without passing the `locale` argument.
- Do NOT regenerate blueprint silently — always show `RegenPermissionBanner` and wait for user choice.
- Do NOT call `auth.protect()` anywhere.
- Do NOT add new localStorage keys outside `lib/persistence.js`.
- Do NOT reset wizard step state or blueprint on back-navigation.

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
RESEND_API_KEY=...          # required in production for email export
```

---

## Phase 14 — Post-MVP Backlog

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
- [ ] PhaseTimeline `t()` for "Done" label and phase status strings
- [ ] StepCapture `t()` for example text and ghost hints (lower priority — mostly content)

scope_standard_hint
intake_scope_standard

are appearing in the stepReview. we need to optimize it properly.
then the feedback page hasn't translated at all.

we have to confirm before logging out. warning their getting out of their saved projects.

1. Use an i18n library for the app UI
   Use an npm i18n package such as i18next or, in Next.js, next-intl. These libraries are designed for locale routing, translation keys, and structured message loading, so your interface can swap languages smoothly without calling an external API for every label. next-intl also handles locale-based routing and localized pathnames in Next.js.

project publicization for to see everyone. and the search can refer to that project not to regenerate. keep this into the next version plan.
also the bengali and arabic choosen font will be added in the next version.
the projects should be publicalized for everyone without names.

we have to set cron and vercel.json and settings appliance throughout the application.

{
"error": "AI provider rate limit exceeded",
"message": "AI provider rate limit exceeded",
"code": "upstream_rate_limited",
"attempts": [
{
"model": "openrouter:meta-llama/llama-3.2-3b-instruct:free",
"provider": "openrouter",
"status": 429,
"code": 429,
"error": "429 Provider returned error"
}
]
}

next:
{
"error": "AI provider unavailable",
"message": "AI provider unavailable",
"code": "upstream_provider_unavailable",
"attempts": [
{
"model": "openrouter:liquid/lfm-2.5-1.2b-instruct:free",
"provider": "openrouter",
"status": 400,
"code": 400,
"error": "400 Provider returned error"
}
]
}
next:
{
"error": "400 {\"id\":\"ojiqevq-2kFHot-9fe3bb332f59ce63\",\"error\":{\"message\":\"Unable to access non-serverless model google/gemma-3-4b-it. Please visit https://api.together.ai/models/google/gemma-3-4b-it to create and start a new dedicated endpoint for the model.\",\"type\":\"invalid_request_error\",\"param\":null,\"code\":\"model_not_available\"}}",
"message": "400 {\"id\":\"ojiqevq-2kFHot-9fe3bb332f59ce63\",\"error\":{\"message\":\"Unable to access non-serverless model google/gemma-3-4b-it. Please visit https://api.together.ai/models/google/gemma-3-4b-it to create and start a new dedicated endpoint for the model.\",\"type\":\"invalid_request_error\",\"param\":null,\"code\":\"model_not_available\"}}",
"code": "upstream_bad_request",
"attempts": [
{
"model": "togetherai:google/gemma-3-4b-it",
"provider": "together-ai",
"status": 400,
"error": "400 {\"id\":\"ojiqevq-2kFHot-9fe3bb332f59ce63\",\"error\":{\"message\":\"Unable to access non-serverless model google/gemma-3-4b-it. Please visit https://api.together.ai/models/google/gemma-3-4b-it to create and start a new dedicated endpoint for the model.\",\"type\":\"invalid_request_error\",\"param\":null,\"code\":\"model_not_available\"}}"
}
]
}

next:
{
"success": true,
"result": {
"index": 0,
"logprobs": null,
"finish_reason": "stop",
"native_finish_reason": "stop",
"message": {
"role": "assistant",
"content": null,
"refusal": null,
"reasoning": "We can see that we have a problem with 0.0.0.0.0.0.0.0.0.0.0.standing the 0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0. Let's placeholder: \"About 5 hours a week\"",
"reasoning_details": [
{
"type": "reasoning.text",
"text": "We can see that we have a problem with 0.0.0.0.0.0.0.0.0.0.0.standing the 0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0. Let's placeholder: \"About 5 hours a week\"",
"format": "unknown",
"index": 0
}
]
},
"usage": {
"prompt": 317,
"completion": 440,
"input_cache_read": 0,
"request": 1,
"billedUsage": 1,
"usd_cents": 0
},
"via_ai_chat_service": true
},
"service": {
"name": "ai-chat"
},
"metadata": {
"service_used": "openrouter",
"providerUsed": "openrouter:nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
}
}

next call:
{
"success": true,
"result": {
"index": 0,
"logprobs": null,
"finish_reason": "stop",
"native_finish_reason": "stop",
"message": {
"role": "assistant",
"content": null,
"refusal": null,
"reasoning": "We can see that we have a problem with 0.0.0.0.0.0.0.0.0.0.0.standing the 0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0. Let's placeholder: \"About 5 hours a week\"",
"reasoning_details": [
{
"type": "reasoning.text",
"text": "We can see that we have a problem with 0.0.0.0.0.0.0.0.0.0.0.standing the 0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0. Let's placeholder: \"About 5 hours a week\"",
"format": "unknown",
"index": 0
}
]
},
"usage": {
"prompt": 317,
"completion": 440,
"input_cache_read": 0,
"request": 1,
"billedUsage": 1,
"usd_cents": 0
},
"via_ai_chat_service": true
},
"service": {
"name": "ai-chat"
},
"metadata": {
"service_used": "openrouter",
"providerUsed": "openrouter:nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
}
}

next call:
{
"error": "Model not found: baidu/qianfan-ocr-fast:free",
"message": "Model not found: baidu/qianfan-ocr-fast:free",
"code": "bad_request"
}

next call:
{
"error": "AI provider rate limit exceeded",
"message": "AI provider rate limit exceeded",
"code": "upstream_rate_limited",
"attempts": [
{
"model": "openrouter:cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
"provider": "openrouter",
"status": 429,
"code": 429,
"error": "429 Provider returned error"
}
]
}

next generate:
{"error":"AI returned empty response. Please try again.","code":"AI_ERROR"}

{
"success": true,
"result": {
"index": 0,
"logprobs": null,
"finish_reason": "stop",
"native_finish_reason": "stop",
"message": {
"role": "assistant",
"content": "{\n \"projectTitle\": \"গ্রামীণ কোচিং সেন্টার বানানো\",\n \"oneLineGoal\": \"আমার গ্রামের জনসংখ্যায় ৫০০০ জনকে কোচিং প্রদান করা\",\n \"problemStatement\": \"শিক্ষা-বিষয়কেন্দ্রিক চরম ফলাফল-ভিত্তিক স্থান তৈরি করা সত্ত্বে, আমার গ্রামে কোচিং সেন্টার বানানো চ্যালেঞ্জ ও এই কাজটির সাথে জড়িত সকল ব্যক্তিকে\",\n \"targetUser\": \"গ্রামীণ শিক্ষার্থী\",\n \"successCriteria\": [\"রোগী ৪০% ভালো ফলাফলের র‌্যাটিংয়ে পৌঁছান\", \"কোচিং সেন্টারে ৮০% বইয়ের সমাধানের হার নেমে আসে\"],\n \"scope\": {\n \"mustHave\": [\"গ্রামপরিষদে কোচিং সেন্টার ওঠা\", \"আমার নির্দেশনায় বিদ্যালয়ের ৭টি শিক্ষককে প্রশিক্ষণ দেওয়া\", \"শিক্ষামাধ্যমে ২ মাসের কোচিং কর্মসূচি চালু করা\"],\n \"niceToHave\": [\"পৃষ্ঠনিদর্শনের বই- বিভাগ তৈরি করা\", \"২রাশ্বে-রোগীদের জন্য বিভাগ তৈরি করা\"],\n \"outOfScope\": [\"স্থানীয় সরকারের সমর্থন অনুষুদ্ধি করা\"]\n },\n \"phases\": [\n {\n \"name\": \"প্ল্যানিং\",\n \"objective\": \"লেজেন্ড সিম্পসনিকে আঞ্জাতেনে রেখে, কোচিং সেন্টারের একটি ঠিক কোরস ডিজাইন তৈরি করা এবং গ্রামের ক্লান্তিবৃদ্ধিপূর্ণ তথ্য সংগ্রহ করা\",\n \"milestones\": [\n {\n \"name\": \"কোচিং সেন্টারের নক্সা তৈরি করা\",\n \"deadline\": \"Week 1\",\n \"doneWhen\": \"কোচিং সেন্টারের ম্যাপ আমার ডিজাইনের সম্মতি পাওয়া\",\n \"risk\": \"গ্রামবাজারে নিয়মিতভাবে অনুক্রম করার সময় মুশকিলতাজনিত সমস্যা\",\n \"tasks\": [\"বিশ্ববিদ্যালয়ের প্রধানকে সঙ্গে হিঠিলা মুড়লেলা নলান, কোচিং সেন্টারের নক্সা দেখাতে\", \"শিক্ষককে শিক্ষামাধ্যমের জন্য একটি ভক্ত প্রোটোকল তৈরি করা\", \"শিক্ষামাধ্যমের জন্য একটি কোর্স সম্পৰ্কে একটি রিপোর্ট তৈরি করা\"]\n },\n {\n \"name\": \"গ্রামে সব থেকে বিস্তর ঘোরাই করা\",\n \"deadline\": \"Week 2\",\n \"doneWhen\": \"তা-বাদ পাওয়া\",\n \"risk\": \"সৈকড়ের মঙ্গল\",\n \"tasks\": [\"ব্লগার সদস্যের জন্য লেখা পরম্পেটা বন্টন করা\", \"জনসংখ্যাকে উদ্দেশ্যার্থে বিবৃতি বিতরায় করা\", \"পুলিশের উলটাইলার যে ো হতোরা\"]\n }\n ]\n },\n {\n \"name\": \"ইমপ্লিমেন্টেশন\",\n \"objective\": \"কোচিং সেন্টের নক্সা তৈরি করা\",\n \"milestones\": [\n {\n \"name\": \"শিক্ষকদের প্রশিক্ষণ\",\n \"deadline\": \"Week 4\",\n \"doneWhen\": \"গ্রাম\" ,\n \"risk\": \"আমাদের প্রশিক্ষণের খরচ বাড়লে আমরা দেখলাম না\",\n \"tasks\": [\"Awশিক্ষককে ২ মাসের কোচিং সচুচীতা তৈরি করতে দেওয়া\", \"পেরেকয়েত্রু\"]\n },\n {\n \"name\": \"শিক্ষামাধ্যমে সেমিনার থাই পরচারা\",\n \"deadline\": \"Week 5\",\n \"doneWhen\" সেমিনারের অংশগ্রহণ\",\n \"risk ফেসবুক\",\n \"tasks\": [\"বহুবিধ শিক্ষক শিক্ষামাধ্যমের উদ্দেশ্যার্থে সূচনা করা\", \"রোগীর পিটবণ্টার খরচ বেঁকুন ু পৃথ্যনির্ধারনী ো এই নকশা থটে ফুটানা করতে\", \"শিক্ষের উইঙ্গীকলপ উলিকুগরণ করা\"]\n }\n ]\n },\n {\n \"name\": \"মঞ্চনা\",\n \"objective\": \"শিক্ষামাথ্যমগ্রামের সারথাপোটা ো তায় ঘর\",\n \"milestones\": [\n {\n \"name\": \"জরিমানা\",\n \"deadline\": \"Week 6\",\n \"doneWhen\": \"সম্পুরণ্ন এনেরা য়ন\",\n \"risk ফেসবুক শিক্ষামাধ্যমের ভিত্তি গটুন্ডড়ির সেো নাঁড্ডি (বেনজাঙ্গির পাঁচ-মদ্ধুসংক্ষপ\",\n \"tasks\": [\"তীন্ডিচযপন এঙ বচার করা\", \"onsommty\", \"ঐ বৌ ].done]>font], \"town auditor\"]\n }\n ]\n }\n ],\n \"dailyNextAction\": \"প্রাইমমারির সেমিনারের ষবাই শি-ফ্টা আবেposta\",\n \"blockers\": [\"সরকারী স্থল শিক্ষামাধ্যমে সেমিনারের অংশগ্ন্য\",\n \"পেশারীয়শা ভিয়োততা বটা নং-ভেতো\"],\n \"toolsSuggested\": [\"Asana, GrabProshops\",\n \"GPBD\",\"QNE\",।\",\n \"{}.Doc\"],\n \"estimatedEffort\": \"১৫ ঘন্টা/day for ৬ সপ্তাহ\",\n \"timeline\": \"৬ সপ্তাহ\",\n \"reviewQuestions\": [\"এই তমক্রমের শ্রেষ্ঠত্বগরণ তা\", \"প্ল্যানিং ভার্চাম করা\", \"উচিতর রকারেণ করা বাই নজরে নেমে নিতে আমাকে চিন্তা বিচিত করলা?\"\n\n}",
"refusal": null,
"reasoning": null
},
"usage": {
"prompt": 869,
"completion": 2915,
"input_cache_read": 0,
"request": 1,
"billedUsage": 1,
"usd_cents": 0.015135999999999998
},
"via_ai_chat_service": true
},
"service": {
"name": "ai-chat"
},
"metadata": {
"service_used": "openrouter",
"providerUsed": "openrouter:meta-llama/llama-3-8b-instruct"
}
}

Model Type Pricing (per M tokens)
PerceptronPerceptron Mk1 Chat $0.15 / $1.5
AnthropicClaude Opus 4.7 Fast Chat $30 / $150
InclusionAIRing 2.6 1T Chat $0.08 / $0.63
BaiduQianfan CoBuddy Chat $0 / $0
xAIGrok 4.3 Chat $1.25 / $2.5
IBM GraniteGranite 4.1 8B Chat $0.05 / $0.1
Mistral AIMistral Medium 3.5 Chat $1.5 / $7.5
PoolsideLaguna M.1 Chat $0 / $0
PoolsideLaguna XS.2 Chat $0 / $0
NVIDIANemotron 3 Nano Omni Chat $0 / $0
QwenQwen3.6 Flash Chat $0.19 / $1.13
QwenQwen3.5 Plus 2026-04-20 Chat $0.3 / $1.8
DeepSeekDeepSeek V4 Flash Chat $0.14 / $0.28
DeepSeekDeepSeek V4 Pro Chat $1.74 / $3.48
OpenAIGPT-5.5 Chat $5 / $30
OpenAIGPT-5.5 Pro Chat $30 / $180
InclusionAILing 2.6 1T Chat $0.3 / $2.5
XiaomiMiMo-V2.5 Chat $0.4 / $2
XiaomiMiMo-V2.5-Pro Chat $1 / $3
TencentHy 3 Preview Chat $0.07 / $0.26
QwenQwen3.6 27B Chat $0.6 / $3.6
OpenAIGPT Image 2 Image $0.0059/image
InclusionAILing 2.6 Flash Chat $0.01 / $0.03
QwenQwen3.6 Max Preview Chat $1.3 / $7.8
Moonshot AIKimi K2.6 Chat $0.95 / $4
BaiduQianfan OCR Fast Chat $0.68 / $2.81
QwenQwen3.6 35B A3B Chat $0.25 / $1.49
AnthropicClaude Opus 4.7 Chat $5 / $25
Z.AIGLM 5.1 Chat $1.4 / $4.4
AnthropicClaude Opus 4.6 Fast Chat $30 / $150
Wan AIWan 2.7 Text-to-Video Video —
GoogleGemma 4 26B A4B Chat $0.06 / $0.33
QwenQwen3.6 Plus Chat $0.5 / $3
GoogleGemma 4 31B Chat $0.12 / $0.37
Z.AIGLM 5V Turbo Chat $1.2 / $4
Arcee AITrinity Large Thinking Chat $0.22 / $0.85
xAIGrok 4.20 Chat $1.25 / $2.5
xAIGrok 4.20 Multi-Agent Chat $2 / $6
GoogleVeo 3.1 Lite Video —
QwenQwen3.6 Plus Preview Chat $0 / $0
KwaiPilotKAT-Coder-Pro V2 Chat $0.3 / $1.2
Reka AIReka Edge Chat $0.1 / $0.1
OpenAIGPT-5.4 Nano Chat $0.2 / $1.25
XiaomiMiMo-V2-Omni Chat $0.4 / $2
XiaomiMiMo-V2-Pro Chat $1 / $3
MiniMaxMiniMax M2.7 Chat $0.28 / $1.2
GoogleGemini 3.1 Flash-Lite Chat $0.25 / $1.5
OpenAIGPT-5.4 Mini Chat $0.75 / $4.5
Mistral AIMistral Small 4 Chat $0.15 / $0.6
Z.AIGLM 5 Turbo Chat $1.2 / $4
xAIGrok 4.20 Beta Chat $2 / $6
xAIGrok 4.20 Multi-Agent Beta Chat $2 / $6
NVIDIANemotron 3 Super Chat $0.09 / $0.45
QwenQwen3.5-9B Chat $0.04 / $0.15
ByteDance SeedSeed 2.0 Lite Chat $0.25 / $2
OpenAIGPT-5.4 Chat $2.5 / $15
OpenAIGPT-5.4 Pro Chat $30 / $180
InceptionMercury 2 Chat $0.25 / $0.75
QwenQwen Image 2.0 Image $0.04/image
QwenQwen Image 2.0 Pro Image $0.08/image
OpenAIGPT-5.3 Chat Chat $1.75 / $14
GoogleGemini 3.1 Flash Image Image $0.067/image
ByteDance SeedSeed 2.0 Mini Chat $0.1 / $0.4
QwenQwen3.5-Flash Chat $0.07 / $0.26
Liquid AILFM2-24B-A2B Chat $0.03 / $0.12
OpenAIGPT-5.3 Codex Chat $1.75 / $14
Aion LabsAion-2.0 Chat $0.8 / $1.6
QwenQwen3.5-122B-A10B Chat $0.4 / $3.2
QwenQwen3.5-27B Chat $0.3 / $2.4
QwenQwen3.5-35B-A3B Chat $0.25 / $2
GoogleGemini 3.1 Pro Chat $2 / $12
AnthropicClaude Sonnet 4.6 Chat $3 / $15
QwenQwen3.5 Plus 02-15 Chat $0.26 / $1.56
QwenQwen3.5 Plus Chat $0.4 / $2.4
QwenQwen3.5 397B A17B Chat $0.6 / $3.6
MiniMaxMiniMax M2.5 Chat $0.15 / $1.15
Z.AIGLM 5 Chat $1 / $3.2
QwenQwen3 Max Thinking Chat $0.78 / $3.9
AnthropicClaude Opus 4.6 Chat $5 / $25
QwenQwen3 Coder Next Chat $0.11 / $0.8
StepFunStep 3.5 Flash Chat $0.1 / $0.3
Upstage AISolar Pro 3 Chat $0.15 / $0.6
Moonshot AIKimi K2.5 Chat $0.6 / $3
MiniMaxMiniMax M2-her Chat $0.3 / $1.2
Arcee AITrinity Large Preview Chat $0.15 / $0.45
Z.AIGLM 4.7 Flash Chat $0 / $0
Z.AIGLM 4.7 FlashX Chat $0.07 / $0.4
Black Forest LabsFLUX.2 [klein] 4B Image —
Black Forest LabsFLUX.2 [klein] 9B Image —
Liquid AILFM2.5-1.2B-Instruct Chat $0 / $0
Liquid AILFM2.5-1.2B-Thinking Chat $0 / $0
Wan AIWan2.6 Image Image $0.03/image
GoogleGemini 3 Flash Chat $0.5 / $3
Mistral AIMinistral 14B Chat $0.2 / $0.2
Mistral AIMinistral 3B Chat $0.04 / $0.04
Mistral AIMinistral 8B Chat $0.1 / $0.1
Mistral AIMistral Small Creative Chat $0.1 / $0.3
NVIDIANemotron 3 Nano 30B A3B Chat $0.05 / $0.2
Allen AIMolmo2 8B Chat $0.2 / $0.2
Z.AIAutoGLM Phone Multilingual Chat $0 / $0
OpenAIGPT-5.2 Chat $1.75 / $14
OpenAIGPT-5.2 Chat Chat $1.75 / $14
OpenAIGPT-5.2 Codex Chat $1.75 / $14
OpenAIGPT-5.2 Pro Chat $21 / $168
GoogleGemini 3 Pro Image Image $0.1351/image
Allen AIOlmo 3.1 32B Instruct Chat $0.2 / $0.6
Allen AIOlmo 3.1 32B Think Chat $0.15 / $0.5
Z.AIGLM 4.6V Chat $0.3 / $0.9
Mistral AIDevstral 2 Chat $0.4 / $2
Z.AIGLM 4.6V Flash Chat $0 / $0
Z.AIGLM 4.6V FlashX Chat $0.04 / $0.4
Mistral AIMistral Large 3 Chat $0.5 / $1.5
Z.AIGLM 4.7 Chat $0.6 / $2.2
OpenAIGPT Image 1.5 Image $0.009/image
MiniMaxMiniMax M2.1 Chat $0.29 / $0.95
DeepSeekDeepSeek V3.2 Chat $0.25 / $0.38
DeepSeekDeepSeek V3.2 Speciale Chat $0.29 / $0.43
Arcee AITrinity Mini Chat $0.05 / $0.15
AmazonNova 2 Lite Chat $0.3 / $2.5
xAIGrok 4.1 Fast Chat $0.2 / $0.5
xAIGrok 4.1 Fast Non-Reasoning Chat $0.2 / $0.5
Allen AIOlmo 3 32B Think Chat $0.15 / $0.5
Allen AIOlmo 3 7B Instruct Chat $0.1 / $0.2
Nex AGIDeepSeek V3.1 Nex N1 Chat $0.14 / $0.5
GoogleGemini 3 Pro Chat $2 / $12
OpenAIGPT-5.1 Chat $1.25 / $10
OpenAIGPT-5.1 Chat Chat $1.25 / $10
OpenAIGPT-5.1 Codex Chat $1.25 / $10
OpenAIGPT-5.1 Codex Mini Chat $0.25 / $2
AnthropicClaude Opus 4.5 Chat $5 / $25
Allen AIOlmo 3 7B Think Chat $0.12 / $0.2
MicrosoftPhi 4 Mini Chat $0.08 / $0.35
GoogleVeo 3.1 Video —
GoogleVeo 3.1 Fast Video —
AnthropicClaude Haiku 4.5 Chat $1 / $5
OpenAIGPT-5.1 Codex Max Chat $1.25 / $10
OpenAIGPT Image 1 Mini Image $0.005/image
ByteDance SeedSeedream 4.0 Image $0.03/image
Z.AIGLM 4.6 Chat $0.6 / $2.2
DeepSeekDeepSeek V3.2 Exp Chat $0.27 / $0.41
AnthropicClaude Sonnet 4.5 Chat $3 / $15
QwenQwen3 Max Chat $1.2 / $6
QwenQwen3-VL Plus Chat $0.2 / $1.6
DeepSeekDeepSeek V3.1 Terminus Chat $0.27 / $0.95
xAIGrok 4 Fast Chat $0.2 / $0.5
xAIGrok 4 Fast Non-Reasoning Chat $0.2 / $0.5
QwenQwen3-Omni Flash Chat $0.43 / $1.66
Moonshot AIKimi K2 0905 Chat $0.6 / $2.5
Moonshot AIKimi K2 Thinking Chat $0.6 / $2.5
QwenQwen3 Next 80B A3B Instruct Chat $0.5 / $2
QwenQwen3 Next 80B A3B Thinking Chat $0.5 / $6
Mistral AIMagistral Medium 1.2 Chat $2 / $5
Mistral AIMagistral Small 1.2 Chat $0.5 / $1.5
MiniMaxMiniMax M2 Chat $0.26 / $1
LongCat Flash Chat Chat $0.2 / $0.8
KwaiPilotKAT-Coder-Pro V1 Chat $0.21 / $0.83
GoogleGemini 2.5 Flash Lite Preview 09-2025 Chat $0.1 / $0.4
GoogleGemini 2.5 Flash Preview 09-2025 Chat $0.3 / $2.5
Mistral AICodestral (August 2025) Chat $0.3 / $0.9
xAIGrok Code Fast 1 Chat $0.2 / $1.5
DeepSeekDeepSeek V3.1 Chat $0.21 / $0.79
NVIDIANemotron Nano 12B 2 VL Chat $0.2 / $0.6
NVIDIANemotron Nano 9B V2 Chat $0.04 / $0.16
Nous ResearchHermes 4 70B Chat $0.13 / $0.4
Cydonia 24B V4.1 Chat $0.3 / $0.5
GoogleImagen 4 Fast Image $0.02/image
GoogleImagen 4 Ultra Image $0.0602/image
GoogleImagen 4 Image $0.04/image
Mistral AIMistral Medium 3.1 Chat $0.4 / $2
Z.AIGLM 4.5V Chat $0.6 / $1.8
OpenAIGPT-5 Chat $1.25 / $10
OpenAIGPT-5 Chat Chat $1.25 / $10
OpenAIGPT-5 Mini Chat $0.25 / $2
OpenAIGPT-5 Nano Chat $0.05 / $0.4
Nous ResearchHermes 4 405B Chat $1 / $3
Mistral AIMistral Medium 3.1 Chat $0.4 / $2
AnthropicClaude Opus 4.1 Chat $15 / $75
QwenQwen Image Image $0.0058/image
MiniMaxMiniMax Hailuo 02 Video —
Z.AIGLM 4.5 Chat $0.6 / $2.2
Z.AIGLM 4.5 Air Chat $0.2 / $1.1
Z.AIGLM 4.5 AirX Chat $1.1 / $4.5
Z.AIGLM 4.5 Flash Chat $0 / $0
Z.AIGLM 4.5 X Chat $2.2 / $8.9
StepFunStep3 Chat $0.57 / $1.42
QwenQwen Plus 0728 Chat $0.26 / $0.78
QwenQwen Plus 0728 (thinking) Chat $0.26 / $0.78
QwenQwen3 235B A22B Instruct 2507 Chat $0.07 / $0.1
QwenQwen3 235B A22B Thinking 2507 Chat $0.15 / $1.5
QwenQwen3 30B A3B Instruct 2507 Chat $0.09 / $0.3
QwenQwen3 30B A3B Thinking 2507 Chat $0.08 / $0.4
QwenQwen3 Coder Flash Chat $0.3 / $1.5
QwenQwen Flash Chat $0.05 / $0.4
QwenQwen3 Coder Plus Chat $1 / $5
QwenQwen3 VL 235B A22B Thinking Chat $0.26 / $2.6
QwenQwen3 VL 30B A3B Instruct Chat $0.13 / $0.52
QwenQwen3 VL 30B A3B Thinking Chat $0.13 / $1.56
QwenQwen3 VL 32B Instruct Chat $0.1 / $0.42
QwenQwen3 VL 8B Instruct Chat $0.08 / $0.5
QwenQwen3 VL 8B Thinking Chat $0.12 / $1.37
OpenAIGPT-OSS 120B Chat $0.04 / $0.18
OpenAIGPT-OSS 20B Chat $0.03 / $0.14
OpenAIGPT-OSS Safeguard 20B Chat $0.08 / $0.3
XiaomiMiMo-V2-Flash Chat $0.1 / $0.3
Mistral AIVoxtral Small Chat $0.1 / $0.3
Mistral AIDevstral Medium Chat $0.4 / $2
Moonshot AIKimi K2 0711 Chat $0.57 / $2.3
Mistral AIDevstral Medium Chat $0.4 / $2
Mistral AIDevstral Small 1.1 Chat $0.1 / $0.3
xAIGrok 4 Chat $3 / $15
xAIGrok 4 0709 Chat $3 / $15
Mistral AIVoxtral Mini Chat $0.04 / $0.04
Mistral AIVoxtral Small 24B Chat $0.1 / $0.3
OpenAIGPT-5 Codex Chat $1.25 / $10
BaiduERNIE 4.5 21B A3B Chat $0.07 / $0.28
BaiduERNIE 4.5 21B A3B Thinking Chat $0.07 / $0.28
BaiduERNIE 4.5 300B A47B Chat $0.28 / $1.1
BaiduERNIE 4.5 VL 28B A3B Chat $0.14 / $0.56
BaiduERNIE 4.5 VL 424B A47B Chat $0.42 / $1.25
TencentHunyuan A13B Instruct Chat $0.14 / $0.57
GoogleGemma 3n 2B Chat $0 / $0
GoogleGemma 3n 4B Chat $0.06 / $0.12
ByteDanceSeedance 1.0 Lite Video —
ByteDanceSeedance 1.0 Pro Video —
Mistral AIMistral Small 3.2 Chat $0.1 / $0.3
Mistral AIMistral Small 3.2 Chat $0.08 / $0.2
GoogleGemini 2.5 Flash-Lite Chat $0.1 / $0.4
ByteDance SeedSeed 1.6 Chat $0.25 / $2
ByteDance SeedSeed 1.6 Flash Chat $0.08 / $0.3
Black Forest LabsFLUX.1 Kontext [dev] Image $0.025/image
Black Forest LabsFLUX.1 Kontext [max] Image $0.08/image
Black Forest LabsFLUX.1 Kontext [pro] Image $0.04/image
OpenAIOpenAI o3 Pro Chat $20 / $80
OpenAIGPT-5 Pro Chat $15 / $120
Arcee AIVirtuoso Large Chat $0.75 / $1.2
GoogleGemini 2.5 Pro Preview 06-05 Chat $1.25 / $10
TNG TechnologyDeepSeek R1T2 Chimera Chat $0.3 / $1.1
TNG TechnologyR1T Chimera Chat $0.25 / $0.85
RelaceRelace Apply 3 Chat $0.85 / $1.25
RelaceRelace Search Chat $1 / $3
Liquid AILFM2-8B-A1B Chat $0.01 / $0.02
Deep CogitoCogito v2.1 671B Chat $1.25 / $1.25
MiniMaxMiniMax M1 Chat $0.4 / $2.2
Prime IntellectINTELLECT-3 Chat $0.2 / $1.1
DeepSeekR1 0528 Chat $0.5 / $2.15
AnthropicClaude Opus 4 Chat $15 / $75
AnthropicClaude Sonnet 4 Chat $3 / $15
Mistral AIDevstral Small Chat $0.1 / $0.3
GoogleImagen 4 Preview Image $0.04/image
GoogleVeo 3 Video —
GoogleVeo 3 with Audio Video —
GoogleVeo 3 Fast Video —
GoogleVeo 3 Fast with Audio Video —
IBM GraniteGranite 4.0 Micro Chat $0.02 / $0.11
Moonshot AIKimi Dev 72B Chat $0.29 / $1.15
Black Forest LabsFLUX.2 [dev] Image $0.03/image
Black Forest LabsFLUX.2 [flex] Image $0.03/image
Black Forest LabsFLUX.2 [max] Image $0.07/image
Black Forest LabsFLUX.2 [pro] Image $0.03/image
ByteDance SeedSeedream 3.0 Image $0.018/image
ViduVidu Q1 Video —
Dolphin Mistral 24B Venice Edition (Uncensored) Chat $0 / $0
Mistral AIMistral Medium 3 Chat $0.4 / $2
GoogleGemini 2.5 Pro Preview 05-06 Chat $1.25 / $10
MorphMorph V3 Fast Chat $0.8 / $1.2
MorphMorph V3 Large Chat $0.9 / $1.9
Deep CogitoCogito V2 Preview Llama 109B Chat $0.18 / $0.59
Deep CogitoCogito V2 Preview Llama 405B Chat $3.5 / $3.5
Deep CogitoCogito V2 Preview Llama 70B Chat $0.88 / $0.88
AmazonNova Premier 1.0 Chat $2.5 / $12.5
WriterPalmyra X5 Chat $0.6 / $6
QwenQwen3 30B A3B Chat $0.09 / $0.45
QwenQwen3 4B Chat $0 / $0
NVIDIALlama 3.3 Nemotron Super 49B V1.5 Chat $0.1 / $0.4
OpenAIOpenAI o3 Deep Research Chat $10 / $40
OpenAIOpenAI o4 Mini Deep Research Chat $2 / $8
Wan AIWan 2.2 Image-to-Video 14B Video —
Wan AIWan 2.2 Text-to-Video 14B Video —
OpenAIGPT Image 1 Image $0.011/image
PixVersePixVerse V5 Video —
Liquid AILFM2-2.6B Chat $0.01 / $0.02
GoogleGemini 2.5 Flash Image Image $0.039/image
OpenAIOpenAI o3 Chat $2 / $8
OpenAIOpenAI o4 Mini Chat $1.1 / $4.4
OpenAIOpenAI o4 Mini High Chat $1.1 / $4.4
KlingKling 2.1 Master Video —
KlingKling 2.1 Standard Video —
KlingKling 2.1 Pro Video —
Z.AIGLM 4 32B 0414 128K Chat $0.1 / $0.1
OpenAIGPT-4.1 Chat $2 / $8
OpenAIGPT-4.1 Mini Chat $0.4 / $1.6
OpenAIGPT-4.1 Nano Chat $0.1 / $0.4
HiDreamI1-Dev Image $0.0045/image
HiDreamI1-Fast Image $0.0032/image
HiDreamI1-Full Image $0.009/image
OpenGVLabInternVL3 78B Chat $0.15 / $0.6
NVIDIALlama 3.1 Nemotron Ultra 253B v1 Chat $0.6 / $1.8
Essential AIRnj 1 Instruct Chat $0.15 / $0.15
Meta LlamaLlama 4 Maverick Chat $0.15 / $0.6
Meta LlamaLlama 4 Scout Chat $0.08 / $0.3
Meta LlamaLlama Guard 4 12B Chat $0.18 / $0.18
QwenQwen3 14B Chat $0.35 / $1.4
QwenQwen3 235B A22B Chat $0.7 / $2.8
QwenQwen3 32B Chat $0.7 / $2.8
QwenQwen3 8B Chat $0.18 / $0.7
QwenQwen3 Coder 480B A35B Chat $1.5 / $7.5
QwenQwen3 Coder 30B A3B Instruct Chat $0.45 / $2.25
QwenQwen3 VL 235B A22B Instruct Chat $0.7 / $2.8
QwenQwen3-VL 30B-A3B Chat $0.2 / $0.8
PerplexitySonar Pro Search Chat $3 / $15
Arcee AISpotlight Chat $0.18 / $0.18
InceptionMercury Coder Chat $0.25 / $0.75
MiniMaxMiniMax Video-01 Director Video —
Z.AIGLM 4 32B Chat $0.1 / $0.1
QwenQVQ Max Chat $1.2 / $4.8
OpenAISora 2 Video —
OpenAISora 2 Pro Video —
AI21 LabsJamba Large 1.7 Chat $2 / $8
AI21 LabsJamba Mini 1.7 Chat $0.2 / $0.4
QwenQwen2.5 VL 32B Instruct Chat $0.2 / $0.6
DeepSeekDeepSeek V3 0324 Chat $0.2 / $0.77
AlibabaTongyi DeepResearch 30B A3B Chat $0.09 / $0.45
OpenAIGPT Audio Chat $2.5 / $10
OpenAIGPT Audio Mini Chat $0.6 / $2.4
GoogleGemini 2.5 Flash Chat $0.3 / $2.5
GoogleGemini 2.5 Pro Chat $1.25 / $10
OpenAIOpenAI o1 Pro Chat $150 / $600
Mistral AIMistral Small 3.1 Chat $0.35 / $0.55
ByteDanceUI-TARS 7B Chat $0.1 / $0.2
IdeogramIdeogram 3.0 Image $0.0602/image
Reka AIReka Flash 3 Chat $0.1 / $0.2
GoogleGemma 3 12B Chat $0.04 / $0.13
GoogleGemma 3 27B Chat $0.08 / $0.16
GoogleGemma 3 4B Chat $0.04 / $0.08
Allen AIOlmo 2 32B Instruct Chat $0.05 / $0.2
OpenAIGPT-4o Mini Search Preview Chat $0.15 / $0.6
OpenAIGPT-4o Search Preview Chat $2.5 / $10
CohereCommand A Chat $2.5 / $10
TNG TechnologyDeepSeek R1T Chimera Chat $0.3 / $1.2
QwenQwQ 32B Chat $0.15 / $0.58
xAIGrok 3 Beta Chat $3 / $15
xAIGrok 3 Mini Beta Chat $0.3 / $0.5
QwenQwQ Plus Chat $0.8 / $2.4
Nous ResearchDeepHermes 3 Mistral 24B Preview Chat $0.02 / $0.1
SwitchPointRouter Chat $0.85 / $3.4
Arcee AICoder Large Chat $0.5 / $0.8
OpenAIGPT-4.5 Preview (Deprecated) Chat $75 / $150
InceptionMercury Chat $0.25 / $0.75
AnthropicClaude 3.7 Sonnet (Thinking) Chat $3 / $15
KlingKling 2.0 Master Video —
AnthropicClaude 3.7 Sonnet Chat $3 / $15
PerplexitySonar Chat $1 / $1
PerplexitySonar Deep Research Chat $2 / $8
PerplexitySonar Pro Chat $3 / $15
PerplexitySonar Reasoning Pro Chat $2 / $8
xAIGrok 3 Chat $3 / $15
xAIGrok 3 Fast Chat $5 / $25
xAIGrok 3 Mini Chat $0.3 / $0.5
xAIGrok 3 Mini Fast Chat $0.6 / $4
Mistral AIMistral Saba Chat $0.2 / $0.6
Arcee AIMaestro Reasoning Chat $0.9 / $3.3
GoogleGemini 2.0 Flash Chat $0.1 / $0.4
GoogleGemini 2.0 Flash Lite Chat $0.08 / $0.3
Skyfall 36B V2 Chat $0.55 / $0.8
Aion LabsAion-1.0 Chat $4 / $8
Aion LabsAion-1.0-Mini Chat $0.7 / $1.4
OpenAIOpenAI o3 Mini High Chat $1.1 / $4.4
Mistral AIMistral Small 3 Chat $0.05 / $0.08
QwenQwen2.5 VL 72B Instruct Chat $0.25 / $0.75
DeepSeekDeepSeek Reasoner Chat $0.56 / $1.68
DeepSeekR1 Chat $0.7 / $2.5
DeepSeekR1 Distill Llama 70B Chat $0.7 / $0.8
DeepSeekR1 Distill Qwen 32B Chat $0.29 / $0.29
QwenQwen-Omni Turbo Chat $0.07 / $0.27
Moonshot AIMoonshot v1 8K Vision (Preview) Chat $0.2 / $2
Moonshot AIMoonshot v1 32K Vision (Preview) Chat $1 / $3
Moonshot AIMoonshot v1 128K Vision (Preview) Chat $2 / $5
MiniMaxMiniMax-01 Chat $0.2 / $1.1
ViduVidu 2.0 Video —
QwenQwen-MT Plus Chat $2.46 / $7.37
QwenQwen-MT Turbo Chat $0.16 / $0.49
DeepSeekDeepSeek Chat Chat $0.56 / $1.68
OpenAIOpenAI o3 Mini Chat $1.1 / $4.4
KlingKling 1.6 Standard Video —
KlingKling 1.6 Pro Video —
GoogleVeo 2 Video —
MicrosoftPhi 4 Chat $0.07 / $0.14
GoogleGemini 2.0 Flash Chat $0.1 / $0.4
GoogleGemini 2.0 Flash-Lite Chat $0.08 / $0.3
CohereCommand R7B (12-2024) Chat $0.04 / $0.15
Llama 3.3 Euryale 70B Chat $0.65 / $0.75
Meta LlamaLlama 3.3 70B Instruct Chat $0.1 / $0.32
xAIGrok 2 Image Image $0.07/image
OpenAIOpenAI o1 Chat $15 / $60
AmazonNova Lite 1.0 Chat $0.06 / $0.24
AmazonNova Micro 1.0 Chat $0.04 / $0.14
AmazonNova Pro 1.0 Chat $0.8 / $3.2
QwenQwen2.5-Omni 7B Chat $0.1 / $0.4
OpenAIGPT-4o 2024-11-20 Chat $2.5 / $10
Mistral AIMistral Large 2 (November 2024) Chat $2 / $6
QwenQwen2.5 Coder 32B Instruct Chat $0.66 / $1
Aion LabsAion-RP 1.0 (8B) Chat $0.8 / $1.6
xAIGrok Beta Chat $5 / $15
xAIGrok Vision Beta Chat $5 / $15
QwenQwen-Turbo Chat $0.05 / $0.2
Mistral AIPixtral Large Chat $2 / $6
QwenQwen-VL OCR Chat $0.72 / $0.72
AnthropicClaude 3.5 Sonnet Chat $3 / $15
Mistral AIMinistral 3B Chat $0.04 / $0.04
Mistral AIMinistral 8B Chat $0.1 / $0.1
OpenAIGPT-4o Extended Chat $6 / $18
RunDiffusionJuggernaut Lightning Flux Image $0.0017/image
RunDiffusionJuggernaut Pro Flux Image $0.0049/image
OpenAIGPT-4o Audio Preview Chat $2.5 / $10
NVIDIALlama 3.1 Nemotron 70B Instruct Chat $1.2 / $1.2
Black Forest LabsFLUX1.1 [pro] Image $0.04/image
Meta LlamaLlama 3.2 11B Vision Instruct Chat $0.25 / $0.25
Meta LlamaLlama 3.2 1B Instruct Chat $0.03 / $0.2
Meta LlamaLlama 3.2 3B Instruct Chat $0.05 / $0.34
Magnum v4 72B Chat $3 / $5
QwenQwen2.5 Coder 7B Instruct Chat $0.03 / $0.09
Mistral AIPixtral 12B Chat $0.1 / $0.1
OpenAIOpenAI o1 Mini (Deprecated) Chat $1.1 / $4.4
SorcererLM 8x22B Chat $4.5 / $4.5
Llama 3.1 70B Hanami x1 Chat $3 / $3
UnslopNemo 12B Chat $0.4 / $0.4
QwenQwen2.5 72B Instruct Chat $1.4 / $5.6
QwenQwen2.5 7B Instruct Chat $0.18 / $0.7
QwenQwen2.5-VL 7B Instruct Chat $0.35 / $1.05
QwenQwen2.5 14B Instruct Chat $0.35 / $1.4
QwenQwen2.5 32B Instruct Chat $0.7 / $2.8
QwenQwen2.5-VL 72B Instruct Chat $2.8 / $8.4
Moonshot AIMoonshot v1 Auto Chat $1 / $3
xAIGrok 2 Vision Chat $2 / $10
xAIGrok 2 Vision 1212 Chat $2 / $10
CohereCommand R (08-2024) Chat $0.15 / $0.6
CohereCommand R+ (08-2024) Chat $2.5 / $10
Rocinante 12B Chat $0.17 / $0.43
xAIGrok 2 Chat $2 / $10
Nous ResearchHermes 3 405B Instruct Chat $1 / $1
Llama 3.1 Euryale 70B v2.2 Chat $0.85 / $0.85
OpenAIChatGPT-4o Latest Chat $5 / $15
OpenAIGPT-4o 2024-08-06 Chat $2.5 / $10
Black Forest LabsFLUX.1 [dev] Image $0.025/image
Black Forest LabsFLUX.1 [dev] LoRA Image $0.025/image
Black Forest LabsFLUX.1 Krea [dev] Image $0.025/image
Black Forest LabsFLUX.1 [pro] Image $0.05/image
Black Forest LabsFLUX.1 [schnell] Image $0.0027/image
Nous ResearchHermes 3 70B Instruct Chat $0.3 / $0.3
Mistral AIMistral Nemo 12B Chat $0.15 / $0.15
Lumimaid v0.2 8B Chat $0.09 / $0.6
Mistral AIMistral Large 2 (July 2024) Chat $2 / $6
Meta LlamaLlama 3.1 405B (base) Chat $4 / $4
Meta LlamaLlama 3.1 405B Instruct Chat $4 / $4
Meta LlamaLlama 3.1 70B Instruct Chat $0.4 / $0.4
Meta LlamaLlama 3.1 8B Instruct Chat $0.02 / $0.05
Meta LlamaLlama Guard 3 8B Chat $0.48 / $0.03
OpenAIGPT-4o Mini Chat $0.15 / $0.6
OpenAIGPT-4o Mini 2024-07-18 Chat $0.15 / $0.6
Mistral AIMistral Nemo Chat $0.02 / $0.03
Mistral AIMistral Nemo Chat $0.15 / $0.15
GoogleGemma 2 27B Chat $0.65 / $0.65
GoogleGemma 2 9B Chat $0.03 / $0.09
Llama 3 8B Lunaris Chat $0.04 / $0.05
Stability AIStable Diffusion 3 Medium Image $0.0019/image
Llama 3 Euryale 70B v2.1 Chat $1.48 / $1.48
Mistral AIMistral 7B Instruct v0.3 Chat $0.2 / $0.2
OpenAIGPT-4o Chat $2.5 / $10
OpenAIGPT-4o 2024-05-13 Chat $5 / $15
Nous ResearchHermes 2 Pro - Llama-3 8B Chat $0.14 / $0.14
Meta LlamaLlama 3 70B Instruct Chat $0.51 / $0.74
Meta LlamaLlama 3 8B Instruct Chat $0.04 / $0.04
Meta LlamaLlamaGuard 2 8B Chat $0.2 / $0.2
Mistral AIMixtral 8x22B Instruct Chat $2 / $6
MicrosoftWizardLM-2 8x22B Chat $0.62 / $0.62
OpenAIGPT-4 Turbo Chat $10 / $30
QwenQwen VL Max Chat $0.8 / $3.2
QwenQwen-Max Chat $1.6 / $6.4
AnthropicClaude 3 Haiku Chat $0.25 / $1.25
Inflection AIInflection 3 Pi Chat $2.5 / $10
Inflection AIInflection 3 Productivity Chat $2.5 / $10
Mistral AIMistral Large Chat $2 / $6
Moonshot AIMoonshot v1 8K Chat $0.2 / $2
Moonshot AIMoonshot v1 32K Chat $1 / $3
Moonshot AIMoonshot v1 128K Chat $2 / $5
QwenQwen-Plus Chat $0.4 / $1.2
QwenQwen VL Plus Chat $0.21 / $0.63
OpenAIGPT-4 Turbo Preview (Deprecated) Chat $10 / $30
Mistral AIMistral 7B Instruct v0.2 Chat $0.2 / $0.2
Mistral AIMistral Tiny Chat $0.25 / $0.25
Mistral AIMixtral 8x7B Instruct Chat $0.54 / $0.54
Noromaid 20B Chat $1 / $1.75
OpenAIGPT-4 1106 Preview Chat $10 / $30
Goliath 120B Chat $3.75 / $7.5
EleutherAILlemma 7b Chat $0.8 / $1.2
OpenAIDALL·E 3 Image $0.04/image
Mistral AIMistral 7B Chat $0.25 / $0.25
Mistral AIMistral 7B Instruct Chat $0.2 / $0.2
Mistral AIMistral 7B Instruct v0.1 Chat $0.11 / $0.19
OpenAIGPT-3.5 Turbo Instruct Chat $1.5 / $2
CodeLLaMa 7B Instruct Solidity Chat $0.8 / $1.2
ReMM SLERP 13B Chat $0.45 / $0.65
MancerWeaver (alpha) Chat $0.75 / $1
MythoMax 13B Chat $0.06 / $0.06
Stability AIStable Diffusion XL Base 1.0 Image $0.0019/image
OpenAIGPT-3.5 Turbo 0613 Chat $1 / $2
OpenAIGPT-3.5 Turbo 16K Chat $3 / $4
DreamShaper Image $0.0006/image
OpenAIGPT-4 Chat $30 / $60
OpenAIGPT-4 0314 Chat $30 / $60
OpenAIGPT-3.5 Turbo Chat $0.5 / $1.5
OpenAIDALL·E 2 Image $0.02/image
Leonardo.AiLucid Origin Image —
Leonardo.AiPhoenix 1.0 Image —
