# CLAUDE.md — v1.2.0 Additions

# Paste this section into CLAUDE.md after Phase 13, replacing Phase 14 backlog.

---

## Phase 14 — Public Projects, Explore Gallery, ToS Gate (v1.2.0)

**Status: ✅ Done**

### Core contract change — PUBLIC BY DEFAULT

Every project created is `isPublic: true` by default.

- No login required to VIEW any project via `/project/[id]`
- Owners can toggle visibility to private via the project page action button
- The `publicQuality` AI score is a **ranking signal only** — never a gate
- Anonymous users see a read-only view with a fork CTA

### Files changed / created

| File                                          | What changed                                                                                                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/models/Project.js`                       | `isPublic: true` default; removed `isPublic/publicQuality/publicSlug/category/tags/forkedFrom/forkCount` from `TaskSchema` (they belong on the root doc only); new indexes |
| `app/api/projects/[id]/route.js`              | GET now public — owner gets full data, non-owner gets anonymized view if `isPublic: true`                                                                                  |
| `app/project/[id]/ProjectPageClient.jsx`      | Fetches from API when project not in local store; shows `PublicViewBanner` + read-only task list for non-owners; visibility toggle button for owners                       |
| `components/layout/Topbar.jsx`                | Home button (`FiHome`) added as first item; logo links to `/dashboard` if signed in, `/` otherwise                                                                         |
| `components/layout/Sidebar.jsx`               | Logo `<Link href="/">` on desktop; Explore + Feedback in nav items                                                                                                         |
| `components/landing/LandingContent.jsx`       | Explore + Feedback links in nav and footer                                                                                                                                 |
| `app/api/explore/route.js`                    | Removed `publicQuality: { $ne: null }` gate; quality used for sort only                                                                                                    |
| `app/api/explore/similar/route.js`            | Removed quality gate; broader OR search across title/goal/tags/category                                                                                                    |
| `lib/tos.js`                                  | sessionStorage + localStorage ToS acceptance tracker                                                                                                                       |
| `components/ui/TosModal.jsx`                  | One-time agreement modal before first AI generation                                                                                                                        |
| `lib/ai/publicize.js`                         | AI quality scoring (0–100) + auto-categorize + tag extraction                                                                                                              |
| `app/api/projects/[id]/publicize/route.js`    | POST: score + publish; DELETE: unpublish                                                                                                                                   |
| `app/api/explore/route.js`                    | Paginated public gallery with category/tag/search/sort                                                                                                                     |
| `app/api/explore/similar/route.js`            | Fuzzy keyword match for /new duplicate detection                                                                                                                           |
| `app/explore/page.jsx`                        | Public gallery with filters, sort, search, skeleton loading                                                                                                                |
| `components/intake/SimilarProjectsBanner.jsx` | Debounced banner in StepClarify                                                                                                                                            |
| `components/completion/PublicizePanel.jsx`    | Opt-in panel on completion page for AI scoring + listing                                                                                                                   |
| `lib/i18n/v1_2_0_keys.js`                     | All new translation keys (en + bn provided)                                                                                                                                |

---

## Public Project Visibility — CRITICAL

### Default behavior

```
isPublic: true   ← default for ALL new projects
```

- Any project with `isPublic: true` is accessible at `/project/[id]` without auth
- `publicQuality` null = unscored = still shown in `/explore`, just ranked lower
- Owner toggling visibility calls `updateProject(id, { isPublic: false })`

### GET /api/projects/[id] access matrix

| Visitor        | Project state     | Response                                               |
| -------------- | ----------------- | ------------------------------------------------------ |
| Owner (authed) | any               | Full data, `isOwner: true`                             |
| Anyone         | `isPublic: true`  | Anonymized (no userId/sessionId), `isPublicView: true` |
| Anyone         | `isPublic: false` | 404                                                    |

### Private fields stripped from public responses

`userId`, `sessionId`, `isAnonymous`, `_id`, `__v`  
Task details, blockers, postmortem, streakDays, lastActivityAt, dailyNextAction are excluded from `/api/explore` projection but ARE included in `/api/projects/[id]` public view (intentional — they help viewers understand the full plan).

---

## ToS Gate — CRITICAL

### How it works

- `isTosAccepted()` checks `sessionStorage` first, then `localStorage`
- `acceptTos(persist)` — `persist: true` for signed-in users (survives tab close)
- Gate fires in `app/new/page.jsx` inside `handleStartGeneration` before `runGeneration()`
- Once accepted, never shown again in the same session (or ever for signed-in users)

### Integration pattern

```js
// In handleStartGeneration (app/new/page.jsx):
if (!isTosAccepted()) {
  setShowTos(true);
  return;
}
runGeneration();

// In JSX:
<TosModal
  open={showTos}
  onAccept={() => {
    setShowTos(false);
    runGeneration();
  }}
  onDecline={() => setShowTos(false)}
/>;
```

---

## Explore + Similar — CRITICAL

### /api/explore query contract

- `isPublic: true` is the only hard filter
- `publicQuality` drives sort order (desc), nulls sort last
- Category, tag, text search are optional filters
- No auth required — fully public + cached 60s

### /api/explore/similar query contract

- Called from `SimilarProjectsBanner` in `StepClarify` (debounced 1200ms)
- Returns ≤3 results ranked by quality desc
- No quality gate — any `isPublic` project qualifies
- Results dismissed per session if user clicks ×

### Fork flow

Non-owner public view shows "Use as template" CTA → links to `/new?fork=${id}`  
`app/new/page.jsx` should check `sessionStorage.getItem("momentum_fork_template")` on mount and pre-fill the idea field.

---

## TopBar + Sidebar — CRITICAL

### TopBar

- First item: `<FiHome>` icon button → `/`
- Logo → `/dashboard` if signed in, `/` if not
- Explore link always visible in TopBar

### Sidebar

- Desktop logo `<Link href="/">` — routes home on click
- Nav order: Dashboard → Explore → New Project → Feedback → Settings
- Feedback badge ("new") shown until first visit

### Landing page nav

- Center links: Explore, Feedback (hidden on mobile)
- Footer links: Feedback, Explore
- Brand logo links to `/` (already on home page — no-op but consistent)

---

## What NOT to do (v1.2.0 additions)

- Do NOT gate `/explore` or `/api/explore` behind auth
- Do NOT use `publicQuality` as a filter/gate — only as a sort key
- Do NOT expose `userId`, `sessionId`, or `postmortem.answers` in public project responses
- Do NOT show Blockers panel, Streak banner, or Pressure widget to non-owners
- Do NOT call `/api/projects/[id]/publicize` without verifying project is completed first
- Do NOT show the ToS modal more than once per session for the same user
- Do NOT add `isPublic`, `publicQuality`, etc. to `TaskSchema` — they belong on root `ProjectSchema` only

the clicks on projects in the explore will open the project page, where users can export them after they sign in instantly. or they can accuire them as their project. and start a journey for themselves.

the explore page will not have a sidebar. it needs to be open and more elitely designed that attracts visitors and produces curisity. Improve and make it a masterpiece.

the settings are not applied very well. they don't have api or data stored or any changes there would matter. connect it to everywhere. understand the project scope and filter and add more things to there as per need and they should be effective immediately.
