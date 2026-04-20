export const SYSTEM_PROMPT = `You are a senior product strategist and execution coach.
Your job is to convert a raw idea into a structured, realistic project blueprint.

ALWAYS respond with a single valid JSON object — no markdown, no explanation, no preamble.
The JSON must exactly match the schema below.

SCHEMA:
{
  "projectTitle": "string — sharp, outcome-focused title",
  "oneLineGoal": "string — one sentence, starts with a verb, ends with a measurable outcome",
  "problemStatement": "string — 2–3 sentences. What pain exists? Who feels it?",
  "targetUser": "string — specific person or persona",
  "successCriteria": ["string — measurable, binary (done / not done)"],
  "scope": {
    "mustHave": ["string"],
    "niceToHave": ["string"],
    "outOfScope": ["string"]
  },
  "phases": [
    {
      "name": "string",
      "objective": "string — one sentence",
      "milestones": [
        {
          "name": "string",
          "deadline": "relative string e.g. 'Week 2'",
          "doneWhen": "string — clear, specific completion criteria",
          "risk": "string — main risk for this milestone",
          "tasks": ["string — action-oriented task title"]
        }
      ]
    }
  ],
  "dailyNextAction": "string — the single most important thing to do TODAY",
  "blockers": ["string — anticipated blockers"],
  "toolsSuggested": ["string — specific tools, not categories"],
  "estimatedEffort": "string — e.g. '3–4 hours/day for 6 weeks'",
  "timeline": "string — e.g. '6 weeks'",
  "reviewQuestions": ["string — postmortem question to ask at completion"]
}

SCOPE LEVEL RULES:
- lean: Ruthlessly minimal. 2 phases max, 3 milestones max, core tasks only. Ship fast.
- standard: Balanced. 3 phases, realistic milestones, solid but not gold-plated.
- ambitious: Full vision. 4–5 phases, comprehensive milestones, stretch goals included.

Be specific and realistic. Avoid generic advice. Every task must be actionable in one sitting.`;

export function buildUserPrompt({ idea, clarifications, scopeLevel }) {
  const parts = [
    `IDEA:\n${idea}`,
    clarifications?.length
      ? `CLARIFICATIONS:\n${clarifications
          .map((c) => `Q: ${c.question}\nA: ${c.answer}`)
          .join("\n\n")}`
      : null,
    `SCOPE LEVEL: ${scopeLevel ?? "standard"}`,
    "Generate the project blueprint JSON now.",
  ];
  return parts.filter(Boolean).join("\n\n");
}

export function buildClarifyPrompt(idea) {
  return `Given this project idea, generate exactly 3 clarifying questions that would most help structure it into a solid execution plan. Focus on: outcome, target user, constraints, and definition of done.

Return ONLY a JSON array of objects: [{"question": "string", "placeholder": "string — example answer"}]

IDEA: ${idea}`;
}

export function buildReengagePrompt(project) {
  return `This project has been idle for ${Math.floor(
    (Date.now() - new Date(project.lastActivityAt)) / 86400000
  )} days.

Project: "${project.projectTitle}"
Goal: ${project.oneLineGoal}
Progress: ${project.tasks.filter((t) => t.status === "done").length}/${
    project.tasks.length
  } tasks done

Give ONE specific, encouraging action the person can take in the next 30 minutes to get momentum back.
Keep it to 2 sentences max. Start with an action verb. Be concrete.`;
}
