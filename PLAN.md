# StopProcast — Build Plan

Full execution roadmap. Check off tasks as they complete.
Update `CLAUDE.md` phase table when a full phase is done.

---

## Phase 1 — Foundation & Design System

**Status: ✅ Done**

- [x] `app/globals.css` — full design token system, dark mode, fonts
- [x] `app/layout.js` — ClerkProvider + ThemeProvider
- [x] `lib/theme.js` — useTheme hook + ThemeContext
- [x] `components/ui/Button.jsx`
- [x] `components/ui/Input.jsx`
- [x] `components/ui/Badge.jsx`
- [x] `components/ui/Card.jsx`
- [x] `components/ui/Modal.jsx`
- [x] `components/ui/Progress.jsx`
- [x] `components/layout/Sidebar.jsx`
- [x] `components/layout/TopBar.jsx`

---

## Phase 2 — Data Layer & State

**Status: ✅ Done**

- [x] `lib/schema.js` — full project JSON schema + factory functions
- [x] `lib/store/projectStore.js` — Zustand + Immer + dual-layer persistence
- [x] `lib/store/uiStore.js`
- [x] `lib/persistence.js` — localStorage + MongoDB API helpers
- [x] `lib/utils/date.js`
- [x] `lib/utils/progress.js`
- [x] `lib/pressure.js` — pressure score algorithm

---

## Phase 3 — Core Pages & AI Intake

**Status: ✅ Done**

- [x] `app/page.js` — dashboard
- [x] `app/new/page.js` — 5-step intake wizard
- [x] `components/intake/StepCapture.jsx`
- [x] `components/intake/StepClarify.jsx`
- [x] `components/intake/StepScope.jsx`
- [x] `components/intake/StepReview.jsx`
- [x] `components/intake/StepCommit.jsx`
- [x] `components/dashboard/ProjectCard.jsx`
- [x] `components/dashboard/EmptyState.jsx`
- [x] `app/api/generate/route.js` — AI generation (OpenRouter/Anthropic)
- [x] `lib/ai/prompts.js`
- [x] `lib/ai/parser.js`

---

## Phase 4 — Execution Mode & Project Pressure

**Status: ✅ Done**

- [x] `app/project/[id]/page.js` — execution hub
- [x] `components/project/NextAction.jsx`
- [x] `components/project/PhaseTimeline.jsx`
- [x] `components/project/TaskList.jsx`
- [x] `components/project/BlockerPanel.jsx`
- [x] `components/project/StreakBanner.jsx`
- [x] `components/project/ProjectPressure.jsx`

---

## Phase 5 — Completion, Postmortem & Polish

**Status: ✅ Done**

- [x] `app/project/[id]/complete/page.js`
- [x] `components/completion/ConfettiBlast.jsx`
- [x] `components/completion/Postmortem.jsx`
- [x] `components/completion/ProjectStats.jsx`
- [x] `app/project/[id]/export/route.js`
- [x] `app/settings/page.js`
- [x] `jsconfig.json`
- [x] `tailwind.config.js`
- [x] `next.config.mjs`
- [x] `postcss.config.mjs`

---

## Phase 6 — Auth, Database & OpenRouter

**Status: ✅ Done**

- [x] `middleware.js` — Clerk route protection
- [x] `app/layout.js` — ClerkProvider added
- [x] `app/(auth)/sign-in/[[...sign-in]]/page.js`
- [x] `app/(auth)/sign-up/[[...sign-up]]/page.js`
- [x] `lib/db/mongoose.js` — MongoDB connection with caching
- [x] `lib/models/Project.js` — Mongoose schema
- [x] `app/api/projects/route.js` — GET all, POST create
- [x] `app/api/projects/[id]/route.js` — GET, PATCH, DELETE
- [x] `lib/ai/openrouter.js` — OpenRouter client (streaming + non-streaming)
- [x] `app/api/generate/route.js` — provider-switching route
- [x] `lib/persistence.js` — dual-layer localStorage + MongoDB
- [x] `lib/store/projectStore.js` — updated for MongoDB sync
- [x] `components/providers/DataProvider.jsx`
- [x] `.env.local` — all secrets documented
- [x] `package.json` — full dependency list

---

## Phase 7 — Post-MVP Backlog

Features to add after launch:

- [ ] Recurring check-ins and deadline reminders (cron / server actions)
- [ ] Timeline / Gantt visualization
- [ ] Dependency mapping between tasks
- [ ] AI weekly status summary generator
- [ ] Notes per phase (rich text — Tiptap or similar)
- [ ] Export to Notion / CSV / PDF
- [ ] Team collaboration (shared projects, assigned tasks)
- [ ] Analytics dashboard (completion rate, avg time per phase)
- [ ] Paid tier gating (Stripe) — then switch `AI_PROVIDER=anthropic` for premium users
- [ ] Mobile app (React Native or Expo)

---

## Full file tree

```
.env.local
jsconfig.json
middleware.js
next.config.mjs
package.json
postcss.config.mjs
tailwind.config.js
CLAUDE.md
PLAN.md

app/
  globals.css
  layout.js
  page.js
  (auth)/
    sign-in/[[...sign-in]]/page.js
    sign-up/[[...sign-up]]/page.js
  new/
    page.js
  project/[id]/
    page.js
    complete/page.js
    export/route.js
  settings/
    page.js
  api/
    generate/route.js
    reengage/route.js
    projects/
      route.js
      [id]/route.js

components/
  providers/
    DataProvider.jsx
  ui/
    Button.jsx  Input.jsx  Badge.jsx
    Card.jsx    Modal.jsx  Progress.jsx
  layout/
    TopBar.jsx  Sidebar.jsx
  dashboard/
    ProjectCard.jsx  EmptyState.jsx
  intake/
    StepCapture.jsx  StepClarify.jsx  StepScope.jsx
    StepReview.jsx   StepCommit.jsx
  project/
    NextAction.jsx    PhaseTimeline.jsx  TaskList.jsx
    BlockerPanel.jsx  StreakBanner.jsx   ProjectPressure.jsx
  completion/
    ConfettiBlast.jsx  Postmortem.jsx  ProjectStats.jsx

lib/
  theme.js
  schema.js
  persistence.js
  pressure.js
  ai/
    openrouter.js
    prompts.js
    parser.js
  db/
    mongoose.js
  models/
    Project.js
  store/
    projectStore.js  uiStore.js
  utils/
    date.js  progress.js
```

---

## Install command

```bash
npm install @clerk/nextjs mongoose framer-motion zustand immer \
  date-fns uuid @dnd-kit/core @dnd-kit/sortable canvas-confetti \
  @anthropic-ai/sdk
```
