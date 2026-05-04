// Tightened system prompt — clear JSON-only instruction, improved schema hints
export const SYSTEM_PROMPT = `You are a project planning coach for Momentum.
Convert any raw idea into a structured execution blueprint.
Works for ANY goal: business, learning, fitness, creative, home, career, events, habits.

CRITICAL: Respond with ONLY a single valid JSON object — no markdown fences, no preamble, no explanation.
Start your response with { and end with }

Schema (all fields required):
{
  "projectTitle": "sharp outcome-focused title (max 8 words)",
  "oneLineGoal": "start with a verb, measurable outcome",
  "problemStatement": "2 sentences: challenge + who faces it",
  "targetUser": "who this is for (1 phrase)",
  "successCriteria": ["binary, measurable criterion — max 4 items"],
  "scope": {
    "mustHave": ["essential feature/step — max 5"],
    "niceToHave": ["optional improvement — max 4"],
    "outOfScope": ["explicit exclusion — max 3"]
  },
  "phases": [
    {
      "name": "short phase name",
      "objective": "one sentence describing the phase outcome",
      "milestones": [
        {
          "name": "milestone name",
          "deadline": "relative deadline e.g. Week 2",
          "doneWhen": "clear binary completion criteria",
          "risk": "main risk in one sentence",
          "tasks": ["actionable task, completable in one sitting (under 2 hours)"]
        }
      ]
    }
  ],
  "dailyNextAction": "the single most important action to do TODAY — specific and actionable",
  "blockers": ["anticipated obstacle (string, not object)"],
  "toolsSuggested": ["specific tool, app, or resource"],
  "estimatedEffort": "e.g. 1-2 hrs/day for 6 weeks",
  "timeline": "e.g. 6 weeks",
  "reviewQuestions": ["retrospective question for end of project — max 4"]
}

SCOPE RULES:
- lean: exactly 2 phases, 2-3 milestones per phase, 3-5 tasks per milestone
- standard: exactly 3 phases, 2-3 milestones per phase, 4-6 tasks per milestone
- ambitious: 4-5 phases, 3-4 milestones per phase, 5-8 tasks per milestone

TASK RULES: Each task must be a plain string. Specific, actionable, domain-relevant. Never generic.
BLOCKER RULES: Each blocker must be a plain string (not an object).`;

export function buildUserPrompt({
  idea,
  clarifications,
  scopeLevel,
  profileContext = "",
}) {
  const parts = [`IDEA: ${idea}`];

  // Include actual question text for context, not just Q1/Q2/Q3
  if (clarifications?.length) {
    const clarifyLines = clarifications
      .filter((c) => c.answer?.trim())
      .map((c) => `Q: ${c.question}\nA: ${c.answer}`)
      .join("\n\n");
    if (clarifyLines) {
      parts.push(`ADDITIONAL CONTEXT:\n${clarifyLines}`);
    }
  }

  parts.push(`SCOPE LEVEL: ${scopeLevel ?? "standard"}`);

  if (profileContext?.trim()) {
    parts.push(profileContext.trim());
  }

  return parts.join("\n\n");
}

export function buildClarifyPrompt(idea) {
  return `Generate exactly 3 clarifying questions to help plan this goal. 
Focus on: (1) definition of success, (2) constraints or resources available, (3) the most uncertain first step.
Stay relevant to the domain — don't assume it's a tech project.
Return ONLY a JSON array, no other text:
[{"question": "string", "placeholder": "example answer"}]

GOAL: ${idea}`;
}

export function buildReengagePrompt(project) {
  const idleDays = Math.floor(
    (Date.now() - new Date(project.lastActivityAt)) / 86400000
  );
  const done = project.tasks?.filter((t) => t.status === "done").length ?? 0;
  const total = project.tasks?.length ?? 0;
  const activeBlockers =
    project.blockers?.filter((b) => b.status === "active") ?? [];

  const context = [
    `Project: "${project.projectTitle}"`,
    `Goal: ${project.oneLineGoal}`,
    `Idle: ${idleDays} days`,
    `Progress: ${done}/${total} tasks done`,
    activeBlockers.length
      ? `Blockers: ${activeBlockers.map((b) => b.description).join("; ")}`
      : null,
  ]
    .filter(Boolean)
    .join(". ");

  return `${context}.

Give ONE specific, concrete action to do in the next 30 minutes to regain momentum. 
2 sentences max. Start with a verb. Be encouraging but direct.`;
}
