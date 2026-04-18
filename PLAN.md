# StopProcast — Build Plan

Full execution roadmap. Check off tasks as they are completed.
Update `CLAUDE.md` phase table when a full phase is done.

---

## Phase 1 — Foundation & Design System

**Timeline:** Week 1
**Goal:** Establish the visual language before writing any features. Every colour, spacing
token, animation curve, and dark/light switch lives here. All future components import from this layer.

### Checklist

- [ ] Configure `app/globals.css` with full design token system (CSS custom properties)
- [ ] Update `app/layout.js` — load Clash Display + DM Sans via next/font, wrap with ThemeProvider
- [ ] Create `lib/theme.js` — useTheme hook + ThemeContext with localStorage persistence
- [ ] Create `components/ui/Button.jsx` — primary, ghost, danger variants with motion
- [ ] Create `components/ui/Input.jsx` — text + textarea, validation states
- [ ] Create `components/ui/Badge.jsx` — status, phase, priority variants
- [ ] Create `components/ui/Card.jsx` — base card with spring hover
- [ ] Create `components/ui/Modal.jsx` — animated overlay dialog
- [ ] Create `components/ui/Progress.jsx` — ring + bar indicators
- [ ] Create `components/layout/Sidebar.jsx` — collapsible nav with motion
- [ ] Create `components/layout/TopBar.jsx` — app bar, theme toggle, user avatar

### Files

```
app/globals.css
app/layout.js
lib/theme.js
components/ui/Button.jsx
components/ui/Input.jsx
components/ui/Badge.jsx
components/ui/Card.jsx
components/ui/Modal.jsx
components/ui/Progress.jsx
components/layout/Sidebar.jsx
components/layout/TopBar.jsx
```

### Key decisions

- Font pairing: **Clash Display** (headings) + **DM Sans** (body)
- Palette: ink black `#0C0C0F`, violet accent `#7F77DD`, emerald progress `#1D9E75`
- Dark mode: class-based, persisted to localStorage
- Motion: Framer Motion with spring physics on card hovers

---

## Phase 2 — Data Layer & State

**Timeline:** Week 2
**Goal:** Define the full project data model before building UI. One Zustand store,
no prop drilling, no scattered useState.

### Checklist

- [ ] Create `lib/schema.js` — full project JSON schema and default factory function
- [ ] Create `lib/store/projectStore.js` — Zustand store with persist + immer middleware
- [ ] Create `lib/store/uiStore.js` — modal state, sidebar open, active view
- [ ] Create `lib/persistence.js` — localStorage read/write with schema versioning
- [ ] Create `lib/utils/date.js` — deadline calc, overdue detection, relative time
- [ ] Create `lib/utils/progress.js` — task %, phase %, overall % helpers
- [ ] Write unit smoke-tests for schema defaults and progress helpers

### Files

```
lib/schema.js
lib/store/projectStore.js
lib/store/uiStore.js
lib/persistence.js
lib/utils/date.js
lib/utils/progress.js
```

### Schema fields (defined in `SCHEMA.md`)

Project-level: `id, projectTitle, oneLineGoal, problemStatement, targetUser,
successCriteria[], scope{mustHave, niceToHave, outOfScope}, phases[], dailyNextAction,
blockers[], resources[], toolsSuggested[], estimatedEffort, timeline, reviewQuestions[],
createdAt, lastActivityAt, streakDays, completionDate, postmortem{}`

Task-level: `id, title, status (todo|doing|done|blocked), phaseId, deadline,
priority (low|medium|high), notes`

---

## Phase 3 — Core Pages & AI Intake

**Timeline:** Weeks 3–4
**Goal:** The three most important screens — dashboard, idea intake wizard, AI generation flow.

### Checklist

- [ ] Build `app/page.js` — dashboard with project card grid
- [ ] Build `app/new/page.js` — 5-step intake wizard shell with step routing
- [ ] Build `components/intake/StepCapture.jsx` — raw idea text input
- [ ] Build `components/intake/StepClarify.jsx` — AI-generated clarifying questions
- [ ] Build `components/intake/StepScope.jsx` — Lean / Standard / Ambitious scope picker
- [ ] Build `components/intake/StepReview.jsx` — editable generated blueprint preview
- [ ] Build `components/intake/StepCommit.jsx` — commitment confirmation + hard deadline
- [ ] Build `components/dashboard/ProjectCard.jsx` — progress ring, streak, phase badge
- [ ] Build `components/dashboard/EmptyState.jsx` — animated first-project prompt
- [ ] Build `app/api/generate/route.js` — Anthropic streaming API route
- [ ] Build `lib/ai/prompts.js` — system prompt + user prompt templates
- [ ] Build `lib/ai/parser.js` — safe JSON parser for AI output with fallback

### Files

```
app/page.js
app/new/page.js
components/intake/StepCapture.jsx
components/intake/StepClarify.jsx
components/intake/StepScope.jsx
components/intake/StepReview.jsx
components/intake/StepCommit.jsx
components/dashboard/ProjectCard.jsx
components/dashboard/EmptyState.jsx
app/api/generate/route.js
lib/ai/prompts.js
lib/ai/parser.js
```

### AI generation notes

- Model: `claude-sonnet-4-20250514`
- Response must be streamed — use `ReadableStream` in the route handler
- Prompt forces JSON output matching the full schema in `SCHEMA.md`
- Client renders tokens live as they arrive (streaming skeleton → live text → blueprint reveal)
- Scope picker (Lean/Standard/Ambitious) triggers a regeneration at that scope level
- User can edit any AI-generated field before committing

---

## Phase 4 — Execution Mode & Project Pressure

**Timeline:** Weeks 5–6
**Goal:** The daily driver. Radical focus — one "next action" above the fold.
The pressure system is what makes this different from a plain task app.

### Checklist

- [ ] Build `app/project/[id]/page.js` — project execution hub
- [ ] Build `components/project/NextAction.jsx` — single most important task, prominent
- [ ] Build `components/project/PhaseTimeline.jsx` — horizontal phase progress
- [ ] Build `components/project/TaskList.jsx` — tasks by phase, drag-to-reorder, swipe-to-done
- [ ] Build `components/project/BlockerPanel.jsx` — active blockers + resolve flow
- [ ] Build `components/project/MilestoneCard.jsx` — milestone with done-when criteria
- [ ] Build `components/project/StreakBanner.jsx` — streak count, loss animation
- [ ] Build `components/project/ProjectPressure.jsx` — idle/missed/age alerts
- [ ] Build `lib/pressure.js` — pressure score algorithm (see rules below)

### Files

```
app/project/[id]/page.js
components/project/NextAction.jsx
components/project/PhaseTimeline.jsx
components/project/TaskList.jsx
components/project/BlockerPanel.jsx
components/project/MilestoneCard.jsx
components/project/StreakBanner.jsx
components/project/ProjectPressure.jsx
lib/pressure.js
```

### Pressure system rules

- **Streak:** +1 day when user marks ≥1 task done that day. Break = reset with animation.
- **Idle warning:** `lastActivityAt` > 3 days → orange banner. > 7 days → red banner + AI re-engagement prompt.
- **Missed milestone:** `milestone.deadline < today` and `status != done` → red callout + AI rescoping suggestion.
- **Project age:** always visible on every card — passive urgency.
- 7-day streak → unlock a badge (stored in project record).

---

## Phase 5 — Completion, Postmortem & Polish

**Timeline:** Week 7
**Goal:** Make "done" feel like an event. Close the loop with a postmortem so the
next project starts smarter. Final motion and accessibility pass.

### Checklist

- [ ] Build `app/project/[id]/complete/page.js` — completion ceremony screen
- [ ] Build `components/completion/ConfettiBlast.jsx` — canvas-confetti on ship
- [ ] Build `components/completion/Postmortem.jsx` — AI-guided retrospective
- [ ] Build `components/completion/ProjectStats.jsx` — days, tasks done, blockers hit
- [ ] Build `app/project/[id]/export/route.js` — export to JSON + Markdown
- [ ] Build `app/settings/page.js` — preferences, API key input, export all
- [ ] Polish: shared `layoutId` transitions between dashboard and project detail
- [ ] Polish: skeleton loading states on every async boundary
- [ ] Polish: keyboard shortcuts (N = new, / = search, space = toggle task done)
- [ ] Polish: mobile layout — bottom sheet replaces sidebar at ≤768px
- [ ] Polish: accessibility audit — focus rings, aria-labels, reduced-motion

### Files

```
app/project/[id]/complete/page.js
components/completion/ConfettiBlast.jsx
components/completion/Postmortem.jsx
components/completion/ProjectStats.jsx
app/project/[id]/export/route.js
app/settings/page.js
```

---

## Phase 2+ (Post-MVP)

Features to add after all 5 phases ship:

- Recurring check-ins and deadline reminders (cron or server actions)
- Timeline visualization (Gantt-style)
- Dependency mapping between tasks
- AI status summary generator ("what happened this week")
- Notes per phase
- Export to Notion / CSV / PDF
- Team collaboration (shared projects, assigned tasks)
- Analytics dashboard (completion rate, average time per phase)
- Free vs paid tier gating

---

## Dependencies

```bash
npm install framer-motion zustand immer date-fns uuid \
  @dnd-kit/core @dnd-kit/sortable canvas-confetti @anthropic-ai/sdk
```
