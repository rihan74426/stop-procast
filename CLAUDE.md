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

the user types and the text-editor founds a title or idea match, then it suggests that a similar project already exists, do you want to check it first?

also ask them if they want their project to be shown to everyone to spread help and knowledge?

check the project and look at the root page (dashboard). if the guest landing is to be crucial then how a person is going to import projects of him to the new browser? we need a different dashboard page where the users can operate on their projects. and landing page will be the guest landing page as per standard. users will go to their dashboard by a button and navigation.

Not all the buttons should be black in the dark mode and white in the light mode. there are special and diversities among them. now it looks bad. the previous color system was better. now the button color is messsing everywhere.
