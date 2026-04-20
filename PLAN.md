# StopProcast — Build Plan

Full execution roadmap. Check off tasks as they are completed.
Update `CLAUDE.md` phase table when a full phase is done.

---

## Phase 1 — Foundation & Design System

**Timeline:** Week 1 · **Status: ✅ Done**

### Checklist

- [x] Configure `app/globals.css` with full design token system (CSS custom properties)
- [x] Update `app/layout.js` — load Clash Display + DM Sans via next/font, wrap with ThemeProvider
- [x] Create `lib/theme.js` — useTheme hook + ThemeContext with localStorage persistence
- [x] Create `components/ui/Button.jsx` — primary, ghost, danger, emerald, subtle variants
- [x] Create `components/ui/Input.jsx` — text + textarea, validation states
- [x] Create `components/ui/Badge.jsx` — status, phase, priority variants
- [x] Create `components/ui/Card.jsx` — base card with hover motion
- [x] Create `components/ui/Modal.jsx` — animated overlay dialog
- [x] Create `components/ui/Progress.jsx` — ring + bar indicators
- [x] Create `components/layout/Sidebar.jsx` — nav with active project list
- [x] Create `components/layout/TopBar.jsx` — app bar, theme toggle

---

## Phase 2 — Data Layer & State

**Timeline:** Week 2 · **Status: ✅ Done**

### Checklist

- [x] Create `lib/schema.js` — full project JSON schema and default factory function
- [x] Create `lib/store/projectStore.js` — Zustand store with persist + immer middleware
- [x] Create `lib/store/uiStore.js` — modal state, sidebar open, active view
- [x] Create `lib/persistence.js` — localStorage read/write with schema versioning
- [x] Create `lib/utils/date.js` — deadline calc, overdue detection, relative time
- [x] Create `lib/utils/progress.js` — task %, phase %, overall % helpers
- [x] Create `lib/pressure.js` — pressure score algorithm

---

## Phase 3 — Core Pages & AI Intake

**Timeline:** Weeks 3–4 · **Status: ✅ Done**

### Checklist

- [x] Build `app/page.js` — dashboard with project card grid
- [x] Build `app/new/page.js` — 5-step intake wizard with step routing
- [x] Build `components/intake/StepCapture.jsx` — raw idea text input
- [x] Build `components/intake/StepClarify.jsx` — AI-generated clarifying questions
- [x] Build `components/intake/StepScope.jsx` — Lean / Standard / Ambitious scope picker
- [x] Build `components/intake/StepReview.jsx` — live streaming blueprint preview
- [x] Build `components/intake/StepCommit.jsx` — commitment confirmation + hard deadline
- [x] Build `components/dashboard/ProjectCard.jsx` — progress ring, streak, phase badge
- [x] Build `components/dashboard/EmptyState.jsx` — animated first-project prompt
- [x] Build `app/api/generate/route.js` — Anthropic streaming API route
- [x] Build `app/api/reengage/route.js` — AI re-engagement for idle projects
- [x] Build `lib/ai/prompts.js` — system prompt + user prompt templates
- [x] Build `lib/ai/parser.js` — safe JSON parser for AI output with fallback

---

## Phase 4 — Execution Mode & Project Pressure

**Timeline:** Weeks 5–6 · **Status: ✅ Done**

### Checklist

- [x] Build `app/project/[id]/page.js` — project execution hub
- [x] Build `components/project/NextAction.jsx` — single most important task, prominent
- [x] Build `components/project/PhaseTimeline.jsx` — horizontal phase progress
- [x] Build `components/project/TaskList.jsx` — tasks by phase, inline add, status cycle
- [x] Build `components/project/BlockerPanel.jsx` — active blockers + resolve flow
- [x] Build `components/project/StreakBanner.jsx` — streak count, idle warnings
- [x] Build `components/project/ProjectPressure.jsx` — idle/missed/age alerts + AI suggestion

---

## Phase 5 — Completion, Postmortem & Polish

**Timeline:** Week 7 · **Status: ✅ Done**

### Checklist

- [x] Build `app/project/[id]/complete/page.js` — completion ceremony (3-section flow)
- [x] Build `components/completion/ConfettiBlast.jsx` — canvas-confetti on ship
- [x] Build `components/completion/Postmortem.jsx` — AI-guided retrospective questions
- [x] Build `components/completion/ProjectStats.jsx` — days, tasks, blockers, streak
- [x] Build `app/project/[id]/export/route.js` — export to JSON + Markdown
- [x] Build `app/settings/page.js` — theme, API key, export all, clear data
- [x] `jsconfig.json` — @/\* path aliases
- [x] `tailwind.config.js` — darkMode: class, font extensions
- [x] `.env.local` — ANTHROPIC_API_KEY template
- [x] `next.config.mjs` — clean config

---

## Phase 2+ (Post-MVP Backlog)

Features to add after the MVP ships:

- [ ] Recurring check-ins and deadline reminders (server actions / cron)
- [ ] Timeline visualization (Gantt-style)
- [ ] Dependency mapping between tasks
- [ ] AI weekly status summary generator
- [ ] Notes per phase (rich text)
- [ ] Export to Notion / CSV / PDF
- [ ] Team collaboration (shared projects, assigned tasks)
- [ ] Analytics dashboard (completion rate, avg time per phase)
- [ ] Free vs paid tier gating

---

## Full file tree (all generated files)

```
app/
  globals.css
  layout.js
  page.js                              ← dashboard
  new/
    page.js                            ← intake wizard
  project/[id]/
    page.js                            ← execution hub
    complete/
      page.js                          ← completion ceremony
    export/
      route.js                         ← JSON + MD export
  settings/
    page.js
  api/
    generate/route.js                  ← Anthropic streaming
    reengage/route.js                  ← idle re-engagement

components/
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
  store/
    projectStore.js  uiStore.js
  utils/
    date.js  progress.js
  ai/
    prompts.js  parser.js

.env.local
jsconfig.json
tailwind.config.js
next.config.mjs
```

---

## Install command

```bash
npm install framer-motion zustand immer date-fns uuid \
  @dnd-kit/core @dnd-kit/sortable canvas-confetti @anthropic-ai/sdk
```
