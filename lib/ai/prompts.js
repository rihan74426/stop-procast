// Trimmed system prompt — saves ~300 tokens vs original
export const SYSTEM_PROMPT = `You are a project planning coach for Momentum.
Convert any raw idea into a structured project blueprint.
Works for ANY goal: business, learning, fitness, creative, home, career, events.

ALWAYS respond with a single valid JSON object — no markdown, no preamble.

Schema:
{
  "projectTitle": "sharp, outcome-focused title",
  "oneLineGoal": "verb + measurable outcome",
  "problemStatement": "2 sentences: challenge + who faces it",
  "targetUser": "who this is for",
  "successCriteria": ["measurable, binary criteria"],
  "scope": {
    "mustHave": ["string"],
    "niceToHave": ["string"],
    "outOfScope": ["string"]
  },
  "phases": [
    {
      "name": "string",
      "objective": "one sentence",
      "milestones": [
        {
          "name": "string",
          "deadline": "e.g. Week 2",
          "doneWhen": "clear completion criteria",
          "risk": "main risk",
          "tasks": ["actionable task under 2 hours"]
        }
      ]
    }
  ],
  "dailyNextAction": "single most important thing to do TODAY",
  "blockers": ["anticipated obstacles"],
  "toolsSuggested": ["specific tools/resources"],
  "estimatedEffort": "e.g. 1-2 hrs/day for 6 weeks",
  "timeline": "e.g. 6 weeks",
  "reviewQuestions": ["retrospective question"]
}

SCOPE: lean=2 phases/3 milestones, standard=3 phases, ambitious=4-5 phases.
Tasks must be completable in one sitting. Be domain-specific, not generic.`;

export function buildUserPrompt({
  idea,
  clarifications,
  scopeLevel,
  profileContext = "",
}) {
  const parts = [
    `IDEA: ${idea}`,
    clarifications?.length
      ? `CONTEXT:\n${clarifications
          .map((c) => `Q: ${c.question}\nA: ${c.answer}`)
          .join("\n")}`
      : null,
    `SCOPE: ${scopeLevel ?? "standard"}`,
    profileContext || null,
  ];
  return parts.filter(Boolean).join("\n\n");
}

export function buildClarifyPrompt(idea) {
  return `Generate 3 clarifying questions for this goal to help structure an execution plan.
Focus on: success criteria, constraints/resources, and the first concrete step.
Stay domain-relevant — don't assume it's a tech project.
Return ONLY: [{"question": "string", "placeholder": "example answer"}]

IDEA: ${idea}`;
}

export function buildReengagePrompt(project) {
  const idleDays = Math.floor(
    (Date.now() - new Date(project.lastActivityAt)) / 86400000
  );
  const done = project.tasks?.filter((t) => t.status === "done").length ?? 0;
  const total = project.tasks?.length ?? 0;
  return `Project "${project.projectTitle}" idle ${idleDays} days. Goal: ${project.oneLineGoal}. Progress: ${done}/${total} tasks.
Give ONE specific action for next 30 minutes to regain momentum. 2 sentences max, start with a verb.`;
}
