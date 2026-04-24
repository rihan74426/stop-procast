@AGENTS.md
@PLAN.md

# Momentum — Project Intelligence File

Single source of truth for all development. Read before writing any code.

---

## What this app is

**Momentum** (formerly StopProcast) is a _Project Execution OS_ — not a task manager.

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
| 6     | Auth, DB, AI Integration       | ✅ Done |
| 7     | i18n, Model Picker, PDF Export | ✅ Done |

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
| PDF export | jsPDF (client-side, dynamic import) | No server needed                   |
| Motion     | Framer Motion                       |                                    |

---

## AI provider system

**Provider details are intentionally hidden from users.** Never mention OpenRouter, model names,
or API keys in the UI. The `lib/ai/client.js` file is the only place that knows the provider.

Three model slots available via `.env.local`:

```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=z-ai/glm-4.5-air:free           # "Balanced" in UI
OPENROUTER_MODEL2=arcee-ai/trinity-large-preview:free  # "Detailed" in UI
OPENROUTER_MODEL3=nvidia/nemotron-3-super-120b-a12b:free  # "Comprehensive" in UI
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add more models by adding `OPENROUTER_MODEL4`, `MODEL5`, etc. and updating `lib/ai/models.js`.

---

## CRITICAL: Server/Client boundary for AI

**The `buildPersonaContext` / `buildProfileContext` error pattern:**

❌ WRONG — importing client utilities in a server route:

```js
// app/api/generate/route.js — THIS CRASHES
import { buildProfileContext } from "@/lib/userProfile"; // if userProfile.js has "use client"
```

✅ CORRECT — build profile context on the client, send as plain string:

```js
// Client component (StepReview.jsx):
const profileContext = buildProfileContext(loadUserProfile()); // pure string
fetch("/api/generate", { body: JSON.stringify({ ..., profileContext }) });

// Server route (route.js):
const { profileContext } = body; // receives as plain string — NO import from userProfile
```

**Rule:** `lib/userProfile.js` must NEVER have `"use client"` at the top. It's a pure utility.
The API route (`app/api/generate/route.js`) must NEVER import from `lib/userProfile.js`.

---

## i18n system

- Provider: `lib/i18n/index.js` — `I18nProvider` + `useI18n()` hook
- Config: `lib/i18n/config.js` — locale list, RTL list
- Translations: `lib/i18n/translations.js` — all 6 language objects
- Wrap `app/layout.js` body with `<I18nProvider>`
- Use `const { t } = useI18n()` in any client component
- RTL support: Arabic sets `dir="rtl"` on `<html>` automatically

---

## Export system

### UTF-8 safe base64 (btoa fix)

The standard `btoa()` crashes with non-Latin1 characters (Arabic, Chinese, emoji).
Always use the safe encoding function in `app/project/[id]/page.jsx`:

```js
function toBase64Safe(str) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}
```

The server-side export route decodes with `Buffer.from(encoded, "base64").toString("utf-8")`
followed by `decodeURIComponent()`.

### PDF export

Client-side only via `lib/utils/exportPDF.js` using jsPDF.
Loaded dynamically: `const { exportProjectPDF } = await import("@/lib/utils/exportPDF")`.
**Requires:** `npm install jspdf` in package.json.

---

## Settings page rules

The settings page (`app/settings/page.jsx`) must:

- ✅ Show AI model selector (friendly names only — "Balanced", "Detailed", "Comprehensive")
- ✅ Show user profile form (profession, skills, experience, response style, extra context)
- ✅ Show language selector (6 language pills)
- ✅ Show theme toggle
- ✅ Show data export/clear
- ❌ NEVER show API key input fields
- ❌ NEVER mention "OpenRouter", model IDs, or provider names

---

## Auth model

Auth is **optional**. Users can use every feature without signing in.

- Guests: data lives in localStorage only.
- Signed-in users: data syncs to MongoDB via `/api/projects`.
- **Auth gate**: shown after blueprint is generated (in `StepReview`), before committing the plan.
  Located at `components/auth/AuthGateModal.jsx`. It's a friendly modal — NOT a hard block.
  Users can click "Continue without saving" to proceed as guest.
- Never block any page with `auth.protect()`.
- API routes check `userId` from Clerk but return graceful no-ops for guests.

---

## Naming

The app is called **Momentum** everywhere. The old name "StopProcast" is retired.

- Page title: "Momentum — Finish What You Start"
- Logo: `/public/logo.png` — used in TopBar, Sidebar, AuthGateModal
- Fallback if logo missing: violet box with arrow SVG

---

## Footer

`components/layout/Footer.jsx` — shown on Dashboard (when projects exist), Project page, Settings.
Contains developer portfolio CTA: https://nuruddin-webician.vercel.app/

---

## File naming

- Components: PascalCase `.jsx` (e.g. `TopBar.jsx` not `Topbar.jsx`)
- Pages: `page.js` or `page.jsx`
- API routes: `route.js`
- Utilities: camelCase `.js`

---

## Key files

| File                                   | Purpose                                           |
| -------------------------------------- | ------------------------------------------------- |
| `lib/ai/client.js`                     | Server-only AI wrapper (provider hidden)          |
| `lib/ai/models.js`                     | Model slot definitions (friendly names only)      |
| `lib/ai/prompts.js`                    | System + user prompt builders                     |
| `lib/userProfile.js`                   | Profile load/save + buildProfileContext (pure)    |
| `lib/i18n/index.js`                    | I18nProvider + useI18n hook                       |
| `lib/i18n/config.js`                   | Locale list + RTL list                            |
| `lib/i18n/translations.js`             | All 6 language translation objects                |
| `lib/utils/exportPDF.js`               | Client-side PDF export via jsPDF                  |
| `components/auth/AuthGateModal.jsx`    | Post-blueprint auth gate (not a hard block)       |
| `components/layout/Footer.jsx`         | Footer with developer portfolio CTA               |
| `components/project/PhaseTimeline.jsx` | Responsive phase progress (mobile + desktop)      |
| `app/api/generate/route.js`            | AI generation — receives profileContext as string |

---

## Package.json additions needed

```bash
npm install jspdf
```

---

## Post-MVP backlog

- [ ] Recurring check-ins / deadline reminders (cron)
- [ ] Timeline / Gantt visualization
- [ ] Task dependency mapping
- [ ] AI weekly status summary
- [ ] Rich text notes per phase (Tiptap)
- [ ] Export to Notion / CSV
- [ ] Team collaboration (shared projects)
- [ ] Analytics dashboard
- [ ] More languages (Japanese, Portuguese, Hindi, Russian)
- [ ] Mobile app (React Native / Expo)

text ghosting auto complete
the navigation incompletes the process and have to restart the process, doesn't keep the progress saved. only back navigation no forward.

GET /api/projects error: MongoServerSelectionError: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert
internal error:openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 80

    at async GET (app\api\projects\route.js:17:22)

15 |
16 | await connectDB();

> 17 | const projects = await Project.find({ userId })

     |                      ^

18 | .sort({ createdAt: -1 })
19 | .lean();
20 | const clean = projects.map(({ \_id, \_\_v, ...p }) => p); {
errorLabelSet: Set(0) {},
reason: [TopologyDescription],
code: undefined,
[cause]: [MongoNetworkError: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openss 16 | await connectDB();

> 17 | const projects = await Project.find({ userId })

     |                      ^

18 | .sort({ createdAt: -1 })
19 | .lean();
20 | const clean = projects.map(({ \_id, **v, ...p }) => p); {
errorLabelSet: Set(0) {},
reason: [TopologyDescription],
code: undefined,
[cause]: [MongoNetworkError: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openss 19 | .lean();
20 | const clean = projects.map(({ \_id, **v, ...p }) => p); {
errorLabelSet: Set(0) {},
reason: [TopologyDescription],
code: undefined,
[cause]: [MongoNetworkError: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openss code: undefined,
[cause]: [MongoNetworkError: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openss [cause]: [MongoNetworkError: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 80
] {
errorLabelSet: Set(1) { 'ResetPool' },
beforeHandshake: false,
[cause]: [Error: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 80
] {
library: 'SSL routines',
reason: 'tlsv1 alert internal error',
code: 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR'
}
}
}
GET /api/projects 500 in 30691ms

] {
errorLabelSet: Set(1) { 'ResetPool' },
beforeHandshake: false,
[cause]: [Error: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 80
] {
library: 'SSL routines',
reason: 'tlsv1 alert internal error',
code: 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR'
}
}
] {
errorLabelSet: Set(1) { 'ResetPool' },
beforeHandshake: false,
[cause]: [Error: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 80
] {
library: 'SSL routines',
reason: 'tlsv1 alert internal error',
] {
errorLabelSet: Set(1) { 'ResetPool' },
beforeHandshake: false,
[cause]: [Error: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 80
] {
errorLabelSet: Set(1) { 'ResetPool' },
beforeHandshake: false,
] {
errorLabelSet: Set(1) { 'ResetPool' },
] {
errorLabelSet: Set(1) { 'ResetPool' },
] {
] {
] {
errorLabelSet: Set(1) { 'ResetPool' },
errorLabelSet: Set(1) { 'ResetPool' },
beforeHandshake: false,
beforeHandshake: false,
[cause]: [Error: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 80
] {
library: 'SSL routines',
reason: 'tlsv1 alert internal error',
code: 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR'
}
}
}
GET /api/projects 500 in 30691ms
✓ Compiled in 1281ms (471 modules)
GET /new 200 in 155ms
GET /new 200 in 93ms
○ Compiling /api/generate ...
✓ Compiled /api/generate in 1903ms (1265 modules)
POST /api/generate 200 in 10834ms
POST /api/generate 200 in 81379ms
POST /api/generate 200 in 180083ms
POST /api/generate 200 in 57658ms
○ Compiling /api/projects ...
✓ Compiled /api/projects in 843ms (827 modules)
POST /api/projects 201 in 1247ms
○ Compiling /project/[id] ...
✓ Compiled /project/[id] in 5s (1790 modules)
✓ Compiled in 870ms (682 modules)
GET /project/706658ad-7f19-4a7d-8752-95ee48c36f52 200 in 13785ms
GET /project/706658ad-7f19-4a7d-8752-95ee48c36f52 200 in 152ms
GET /project/706658ad-7f19-4a7d-8752-95ee48c36f52 200 in 102ms
○ Compiling /api/reengage ...
✓ Compiled /api/reengage in 1888ms (1794 modules)
GET /project/706658ad-7f19-4a7d-8752-95ee48c36f52 200 in 597ms
[reengage] error: TypeError: fetch failed
at async openrouterGenerate (lib\ai\openrouter.js:20:15)
at async POST (app\api\reengage\route.js:10:18)
18 | ) {
19 | const model = modelOverride || DEFAULT_MODEL();

> 20 | const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {

     |               ^

21 | method: "POST",
22 | headers: headers(),
23 | body: JSON.stringify({ {
[cause]: [Error [ConnectTimeoutError]: Connect Timeout Error (attempted addresses: 104.18.2.115:443, 104.18.3.115:443, timeout: 10000ms)] {
code: 'UND_ERR_CONNECT_TIMEOUT'
}
}
POST /api/reengage 500 in 12968ms
[reengage] error: TypeError: fetch failed
at async openrouterGenerate (lib\ai\openrouter.js:20:15)
at async POST (app\api\reengage\route.js:10:18)
18 | ) {
19 | const model = modelOverride || DEFAULT_MODEL();

> 20 | const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {

     |               ^

21 | method: "POST",
22 | headers: headers(),
23 | body: JSON.stringify({ {
at async POST (app\api\reengage\route.js:10:18)
18 | ) {
19 | const model = modelOverride || DEFAULT_MODEL();

> 20 | const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {

     |               ^

21 | method: "POST",
22 | headers: headers(),
at async POST (app\api\reengage\route.js:10:18)
18 | ) {
19 | const model = modelOverride || DEFAULT_MODEL();

> 20 | const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {

     |               ^

21 | method: "POST",
at async POST (app\api\reengage\route.js:10:18)
18 | ) {
19 | const model = modelOverride || DEFAULT_MODEL();

> 20 | const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {

     |               ^
    at async POST (app\api\reengage\route.js:10:18)

18 | ) {
19 | const model = modelOverride || DEFAULT_MODEL();

> 20 | const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {

    at async POST (app\api\reengage\route.js:10:18)

18 | ) {
19 | const model = modelOverride || DEFAULT_MODEL();

> 20 | const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {

     |               ^
    at async POST (app\api\reengage\route.js:10:18)

18 | ) {
19 | const model = modelOverride || DEFAULT_MODEL();

> 20 | const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {

    at async POST (app\api\reengage\route.js:10:18)

18 | ) {
19 | const model = modelOverride || DEFAULT_MODEL();

> 20 | const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {

     |               ^
    at async POST (app\api\reengage\route.js:10:18)

18 | ) {
19 | const model = modelOverride || DEFAULT_MODEL();

> 20 | const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {

     |               ^

21 | method: "POST",
at async POST (app\api\reengage\route.js:10:18)
18 | ) {
19 | const model = modelOverride || DEFAULT_MODEL();

> 20 | const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {

     |               ^

21 | method: "POST",
at async POST (app\api\reengage\route.js:10:18)
18 | ) {
19 | const model = modelOverride || DEFAULT_MODEL();

> 20 | const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {

     |               ^

> 20 | const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {

     |               ^

21 | method: "POST",
22 | headers: headers(),
23 | body: JSON.stringify({ {
[cause]: [Error [ConnectTimeoutError]: Connect Timeout Error (attempted addresses: 104.18.2.115:443, 104.18.3.115:443, timeout: 10000ms)] {
code: 'UND_ERR_CONNECT_TIMEOUT'
}
}
POST /api/reengage 500 in 13152ms
GET / 200 in 1023ms
POST / 200 in 65ms
POST / 200 in 105ms
GET /api/projects error: MongoServerSelectionError: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert
internal error:openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 80

    at async GET (app\api\projects\route.js:17:22)

15 |
16 | await connectDB();

> 17 | const projects = await Project.find({ userId })

     |                      ^

18 | .sort({ createdAt: -1 })
19 | .lean();
20 | const clean = projects.map(({ \_id, **v, ...p }) => p); {
errorLabelSet: Set(0) {},
reason: [TopologyDescription],
code: undefined,
[cause]: [MongoNetworkError: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openss 20 | const clean = projects.map(({ \_id, **v, ...p }) => p); {
errorLabelSet: Set(0) {},
reason: [TopologyDescription],
code: undefined,
[cause]: [MongoNetworkError: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openss reason: [TopologyDescription],
code: undefined,
[cause]: [MongoNetworkError: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 80
[cause]: [MongoNetworkError: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 80
l\ssl\record\rec_layer_s3.c:916:SSL alert number 80
] {
] {
errorLabelSet: Set(1) { 'ResetPool' },
beforeHandshake: false,
[cause]: [Error: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 80
] {
library: 'SSL routines',
reason: 'tlsv1 alert internal error',
beforeHandshake: false,
[cause]: [Error: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 80
] {
library: 'SSL routines',
reason: 'tlsv1 alert internal error',
code: 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR'
}
}
}
GET /api/projects 500 in 30318ms

    beforeHandshake: false,
    [cause]: [Error: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 80
    ] {
      library: 'SSL routines',
      reason: 'tlsv1 alert internal error',
      code: 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR'
    }

}
}
GET /api/projects 500 in 30318ms

    beforeHandshake: false,
    [cause]: [Error: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 80
    ] {
      library: 'SSL routines',
      reason: 'tlsv1 alert internal error',
      code: 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR'
    }

}
}
GET /api/projects 500 in 30318ms

    beforeHandshake: false,
    [cause]: [Error: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 80
    ] {
      library: 'SSL routines',
      reason: 'tlsv1 alert internal error',
      code: 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR'
    }
    [cause]: [Error: 24290000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:openssl\ssl\record\rec_layer_s3.c:916:SSL alert number 80
    ] {
      library: 'SSL routines',
      reason: 'tlsv1 alert internal error',
      library: 'SSL routines',
      reason: 'tlsv1 alert internal error',
      reason: 'tlsv1 alert internal error',
      code: 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR'
    }

}
}
GET /api/projects 500 in 30318ms

## Strategies to Maximize Sessions on the Free Tier

**Reduce tokens per request**

- Keep your prompts concise and focused — avoid padding or redundant context
- Trim conversation history aggressively; only include the messages necessary for the model to understand the current task
- Use shorter system prompts

**Use Response Caching**
OpenRouter offers a **Response Caching** feature (currently in beta) that returns cached responses for identical requests at **zero cost** — all billable usage counters are reported as `0` [^3]. If any of your 4 requests per session are repeated or templated (e.g., a fixed system prompt + same query), enabling caching with the `X-OpenRouter-Cache: true` header can eliminate token costs for those hits entirely:

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-OpenRouter-Cache: true" \
  -d '{
    "model": "openrouter/free",
    "messages": [{"role": "user", "content": "Your repeated query here"}]
  }'
```

**Monitor usage per response**
Every OpenRouter response automatically includes a `usage` object with token counts and cost — no extra API calls needed [^4]. Use this to identify which of your 4 requests is consuming the most tokens and optimize those first:

```python
response = client.chat.completions.create(
    model="openrouter/free",
    messages=[{"role": "user", "content": "Your message"}]
)
print("Usage Stats:", response.usage)
```

**Batch your work efficiently**

- Structure your 4 requests per session so each one builds on the last without re-sending large context blocks
- Pass only the _delta_ of information in each follow-up message rather than the full conversation history where possible

these error came after starting to the end and then login. mongodb is failing on fetching the project data and saving them.

we need to save every calls and project on mongodb first. then when user logs in and we connect them to the user by updating them and mark them.
