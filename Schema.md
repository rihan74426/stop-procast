# StopProcast — Data Schema

The canonical project data model. `lib/schema.js` must match this exactly.
Update this file whenever a field is added, renamed, or removed.

---

## Project object

```json
{
  "id": "uuid-v4",
  "projectTitle": "string",
  "oneLineGoal": "string — one sentence, outcome-focused",
  "problemStatement": "string",
  "targetUser": "string",
  "successCriteria": ["string"],

  "scope": {
    "mustHave": ["string"],
    "niceToHave": ["string"],
    "outOfScope": ["string"]
  },

  "scopeLevel": "lean | standard | ambitious",

  "phases": [
    {
      "id": "uuid-v4",
      "name": "string",
      "objective": "string",
      "order": 0,
      "status": "upcoming | active | done",
      "milestones": [
        {
          "id": "uuid-v4",
          "name": "string",
          "deadline": "ISO 8601 date string",
          "doneWhen": "string — clear completion criteria",
          "risk": "string",
          "status": "pending | done | missed",
          "tasks": ["task-id"]
        }
      ]
    }
  ],

  "tasks": [
    {
      "id": "uuid-v4",
      "title": "string",
      "status": "todo | doing | done | blocked",
      "phaseId": "phase-id",
      "milestoneId": "milestone-id | null",
      "deadline": "ISO 8601 date string | null",
      "priority": "low | medium | high",
      "notes": "string",
      "createdAt": "ISO 8601",
      "completedAt": "ISO 8601 | null"
    }
  ],

  "dailyNextAction": "string — AI or user-set, updated daily",

  "blockers": [
    {
      "id": "uuid-v4",
      "description": "string",
      "status": "active | resolved",
      "createdAt": "ISO 8601",
      "resolvedAt": "ISO 8601 | null"
    }
  ],

  "resources": ["string — URLs or references"],
  "toolsSuggested": ["string"],
  "estimatedEffort": "string — e.g. '40 hours over 6 weeks'",
  "timeline": "string — e.g. '6 weeks'",

  "reviewQuestions": ["string — postmortem prompts, AI-generated"],

  "streakDays": 0,
  "lastActivityAt": "ISO 8601",
  "createdAt": "ISO 8601",
  "completionDate": "ISO 8601 | null",

  "postmortem": {
    "completedAt": "ISO 8601 | null",
    "answers": [
      {
        "question": "string",
        "answer": "string"
      }
    ],
    "stats": {
      "daysToComplete": 0,
      "tasksCompleted": 0,
      "tasksAdded": 0,
      "blockersHit": 0,
      "milestonesOnTime": 0,
      "milestonesMissed": 0
    }
  }
}
```

---

## Status enumerations

### Project status (derived, not stored)

Computed from phase and task data. Never a stored field.

| Condition                       | Derived status |
| ------------------------------- | -------------- |
| No phases active, no tasks done | `idle`         |
| Any task `doing` or done today  | `active`       |
| `lastActivityAt` > 3 days ago   | `idle-warning` |
| `lastActivityAt` > 7 days ago   | `idle-danger`  |
| `completionDate` is set         | `completed`    |

### Task status

- `todo` — not started
- `doing` — actively being worked on
- `done` — completed
- `blocked` — waiting on something external

### Milestone status

- `pending` — deadline in the future
- `done` — all criteria met
- `missed` — deadline passed, not done

---

## Default factory (used in `lib/schema.js`)

```js
import { v4 as uuid } from "uuid";

export function createProject(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    projectTitle: "",
    oneLineGoal: "",
    problemStatement: "",
    targetUser: "",
    successCriteria: [],
    scope: { mustHave: [], niceToHave: [], outOfScope: [] },
    scopeLevel: "standard",
    phases: [],
    tasks: [],
    dailyNextAction: "",
    blockers: [],
    resources: [],
    toolsSuggested: [],
    estimatedEffort: "",
    timeline: "",
    reviewQuestions: [],
    streakDays: 0,
    lastActivityAt: now,
    createdAt: now,
    completionDate: null,
    postmortem: {
      completedAt: null,
      answers: [],
      stats: {
        daysToComplete: 0,
        tasksCompleted: 0,
        tasksAdded: 0,
        blockersHit: 0,
        milestonesOnTime: 0,
        milestonesMissed: 0,
      },
    },
    ...overrides,
  };
}
```

---

## Persistence

- Stored in `localStorage` under key `stopprocast_projects_v1`
- Key is versioned (`_v1`) — bump to `_v2` if schema has a breaking change and write a migration in `lib/persistence.js`
- Shape stored: `{ version: 1, projects: Project[] }`
