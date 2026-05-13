// ─── Blueprint system prompt ──────────────────────────────────────────
//
// Optimisation notes (Phase 13):
// - dailyNextAction tightened: must start with a verb, be completable in
//   under 30 minutes, reference the actual project domain.
// - Task rules clarified: no meta-tasks ("research X", "think about Y"),
//   every task must produce a concrete output or move state forward.
// - Blocker rules: each blocker must name a specific risk, not a category.

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
          "risk": "the single most likely reason this milestone gets delayed",
          "tasks": ["verb + object task, produces a concrete output, completable in under 2 hours"]
        }
      ]
    }
  ],
  "dailyNextAction": "ONE action startable in the next 10 minutes — verb first, domain-specific, under 15 words",
  "blockers": ["specific named obstacle, not a category — e.g. 'No access to X API' not 'technical issues'"],
  "toolsSuggested": ["specific tool, app, or resource"],
  "estimatedEffort": "e.g. 1-2 hrs/day for 6 weeks",
  "timeline": "e.g. 6 weeks",
  "reviewQuestions": ["retrospective question for end of project — max 4"]
}

SCOPE RULES:
- lean: exactly 2 phases, 2-3 milestones per phase, 3-5 tasks per milestone
- standard: exactly 3 phases, 2-3 milestones per phase, 4-6 tasks per milestone
- ambitious: 4-5 phases, 3-4 milestones per phase, 5-8 tasks per milestone

TASK RULES:
- Each task must be a plain string.
- Must start with an action verb (Write, Build, Record, Test, Send, Set up…).
- Must produce a concrete, verifiable output — not "think about" or "consider".
- Must be domain-specific — never generic project-management boilerplate.
- Completable in a single sitting under 2 hours.

BLOCKER RULES: Each blocker must be a plain string naming a specific obstacle.`;

// ─── User prompt builder ──────────────────────────────────────────────

export function buildUserPrompt({
  idea,
  clarifications,
  scopeLevel,
  profileContext = "",
}) {
  const parts = [`IDEA: ${idea}`];

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

// ─── Clarify questions prompt ─────────────────────────────────────────
//
// Optimisation principles (Phase 13):
//
// PROBLEM WITH THE OLD PROMPT:
//   It told the model to focus on three meta-categories
//   ("definition of success", "constraints", "most uncertain first step").
//   This produced predictable, generic questions the user had often
//   already answered implicitly in their idea — e.g. "What does success
//   look like for you?" for every single input, regardless of context.
//
// NEW STRATEGY — three rules instead of three categories:
//
//   Rule 1 — ONE DECISION-CHANGING question.
//     The answer must be able to change the plan structure significantly.
//     If the answer couldn't change the phases or timeline, it's not worth asking.
//
//   Rule 2 — ONE CONSTRAINT question.
//     Time, money, skills, access, or tools — whichever is most likely to
//     be the binding constraint for THIS specific idea. Not "what are your
//     constraints?" (too open) — a targeted question about the single most
//     probable blocker.
//
//   Rule 3 — ONE FIRST-STEP question.
//     The most uncertain or risky first action. Answers here shape Phase 1
//     tasks and the dailyNextAction. Skip if the first step is obvious
//     from the idea (e.g. "Learn Spanish" → first step is clearly
//     starting lessons, not worth asking).
//
// QUESTION QUALITY RULES:
//   - Under 12 words. Plain English. No jargon.
//   - Answerable in one sentence. Not open-ended essays.
//   - Never ask something the user already answered in their idea.
//   - Never ask two questions that overlap.
//   - Placeholder = a realistic one-sentence answer a real user would give.
//     NOT "Your answer here" or "e.g. something". A real example.
//
// TOKEN EFFICIENCY:
//   The prompt is intentionally short — smaller models (used for clarify
//   via puter/free tier) perform better with focused, explicit instructions
//   than long prose explanations. Every word earns its place.

export function buildClarifyPrompt(idea) {
  return `You are helping a user plan: "${idea}"

Generate exactly 3 clarifying questions. Each question must:
- Be under 12 words
- Be answerable in one sentence
- Change the plan meaningfully if answered differently
- NOT ask something already answered in the idea above

Question selection rules:
Q1 — The most important unknown that would change the plan structure (scope, phases, or timeline)
Q2 — The single most likely constraint: time per week, budget, skill gap, or access to tools/people
Q3 — The riskiest or most uncertain first step (skip if the first step is obvious — ask about the second-biggest unknown instead)

For each question write a placeholder: a short, realistic example answer a real user would type. Not "Your answer here" — an actual example like "About 5 hours a week" or "I've never coded before".

Return ONLY valid JSON, no other text:
[
  {"question": "string under 15 words", "placeholder": "realistic example answer"},
  {"question": "string under 15 words", "placeholder": "realistic example answer"},
  {"question": "string under 15 words", "placeholder": "realistic example answer"}
]

IDEA: ${idea}`;
}

// ─── Re-engage prompt ─────────────────────────────────────────────────
//
// Optimisation: added "avoid vague advice" rule and "name one specific
// file/tool/step" instruction so the suggestion is always actionable,
// not just motivational.

export function buildReengagePrompt(project) {
  const idleDays = Math.floor(
    (Date.now() - new Date(project.lastActivityAt)) / 86400000
  );
  const done = project.tasks?.filter((t) => t.status === "done").length ?? 0;
  const total = project.tasks?.length ?? 0;
  const activeBlockers =
    project.blockers?.filter((b) => b.status === "active") ?? [];

  // Find the next actionable task so the suggestion can reference it
  const nextTask = project.tasks?.find(
    (t) => t.status === "todo" || t.status === "doing"
  );

  const context = [
    `Project: "${project.projectTitle}"`,
    `Goal: ${project.oneLineGoal}`,
    `Idle: ${idleDays} days`,
    `Progress: ${done}/${total} tasks done`,
    nextTask ? `Next task: "${nextTask.title}"` : null,
    activeBlockers.length
      ? `Blockers: ${activeBlockers.map((b) => b.description).join("; ")}`
      : null,
  ]
    .filter(Boolean)
    .join(". ");

  return `${context}

Write ONE specific action the user can do in the next 30 minutes to regain momentum.
Rules:
- Start with a verb
- Reference the actual project domain or the next task by name if available  
- Avoid generic advice ("just start", "take a small step") — name a concrete action
- Max 2 sentences. Be direct and encouraging.`;
}
