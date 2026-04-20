import { v4 as uuid } from "uuid";

// ─── Factory functions ────────────────────────────────────────────────

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
    scopeLevel: "standard", // 'lean' | 'standard' | 'ambitious'
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
    postmortem: createPostmortem(),
    ...overrides,
  };
}

export function createPhase(overrides = {}) {
  return {
    id: uuid(),
    name: "",
    objective: "",
    order: 0,
    status: "upcoming", // 'upcoming' | 'active' | 'done'
    milestones: [],
    ...overrides,
  };
}

export function createMilestone(overrides = {}) {
  return {
    id: uuid(),
    name: "",
    deadline: null,
    doneWhen: "",
    risk: "",
    status: "pending", // 'pending' | 'done' | 'missed'
    tasks: [], // task ids
    ...overrides,
  };
}

export function createTask(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    title: "",
    status: "todo", // 'todo' | 'doing' | 'done' | 'blocked'
    phaseId: null,
    milestoneId: null,
    deadline: null,
    priority: "medium", // 'low' | 'medium' | 'high'
    notes: "",
    createdAt: now,
    completedAt: null,
    ...overrides,
  };
}

export function createBlocker(overrides = {}) {
  return {
    id: uuid(),
    description: "",
    status: "active", // 'active' | 'resolved'
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    ...overrides,
  };
}

export function createPostmortem() {
  return {
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
  };
}

// ─── Schema version (bump on breaking changes) ────────────────────────
export const SCHEMA_VERSION = 1;
