<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ
from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before
writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# Agent rules for StopProcast

Read `CLAUDE.md` and `PLAN.md` before writing any code in this repo.

## Before you start any task

1. Check `CLAUDE.md` → current phase status table. Know which phase is active.
2. Check `PLAN.md` → find the checklist for the active phase. Only work on unchecked items.
3. Check `SCHEMA.md` before adding any new data field. If a field isn't there, add it to `SCHEMA.md` first, then to `lib/schema.js`.

## Auth model — IMPORTANT

Auth is **optional**. Users can use every feature without signing in.

- Guests: data lives in localStorage only.
- Signed-in users: data syncs to MongoDB via `/api/projects`.
- Never block any page or API route with `auth.protect()`.
- API routes check `userId` from Clerk but return graceful no-ops for guests, not 401s.
- The `SavePromptModal` component handles the sign-in nudge — don't add sign-in walls anywhere else.

## Code conventions

- **Components:** functional only, no class components
- **Imports:** always use `@/` path aliases
- **Styles:** Tailwind utility classes + CSS custom properties from `globals.css`. No inline style objects except for dynamic values.
- **State:** read/write project data only through Zustand actions in `projectStore.js`. No direct localStorage access outside `lib/persistence.js`.
- **AI calls:** only in `app/api/` route handlers. Never import `@anthropic-ai/sdk` or `openrouter` in client components.
- **Async boundaries:** every `async` component or data fetch needs a `<Suspense>` wrapper with a skeleton fallback.
- **DataProvider:** every page that reads project data must be wrapped in `<DataProvider>`. This triggers MongoDB hydration for signed-in users.

## File naming

- Pages: `app/[route]/page.js`
- API routes: `app/api/[route]/route.js`
- Components: `components/[domain]/ComponentName.jsx` — PascalCase
- Utilities: `lib/[name].js` — camelCase

## Marking progress

After completing a checklist item in `PLAN.md`, mark it done:

```
- [x] Build components/project/NextAction.jsx
```

After completing a full phase, update the status table in `CLAUDE.md`:

```
| 1 | Foundation & Design System | ✅ Done |
```

## What not to do

- Do not call `auth.protect()` anywhere — auth is optional
- Do not add npm packages without updating the install command in `CLAUDE.md`
- Do not hardcode colors — use CSS custom properties
- Do not call the AI providers from client components
- Do not create new localStorage keys — all persistence goes through `lib/persistence.js`
- Do not skip skeleton loaders on async boundaries
- Do not call `addProject` / store actions without `await` — they are all async
  ``-0
