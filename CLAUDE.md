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
