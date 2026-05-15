// ─── Language name map ────────────────────────────────────────────────
// Used to instruct the AI to respond in the user's selected language.

const LANGUAGE_NAMES = {
  en: "English",
  bn: "Bengali (বাংলা)",
  ar: "Arabic (العربية)",
  fr: "French (Français)",
  es: "Spanish (Español)",
  de: "German (Deutsch)",
  zh: "Chinese (中文)",
};

/**
 * Returns a terse language instruction prepended to every prompt.
 * The instruction is in English so the model reliably understands it,
 * but tells it to output in the target language.
 */
function langInstruction(locale = "en") {
  if (!locale || locale === "en") return "";
  const name = LANGUAGE_NAMES[locale] || locale;
  return `IMPORTANT: Respond entirely in ${name}. Every field value, task title, milestone name, phase name, blocker, tool suggestion, and success criterion must be written in ${name}. Do not use English except for JSON keys.\n\n`;
}

// ─── Blueprint system prompt ──────────────────────────────────────────

export function buildSystemPrompt(locale = "en") {
  const lang = langInstruction(locale);
  return `${lang}You are a project planning coach for Momentum.
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
  "blockers": ["specific named obstacle — e.g. 'No access to X API' not 'technical issues'"],
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
}

// Keep SYSTEM_PROMPT as a named export for server-side routes that don't have locale context
export const SYSTEM_PROMPT = buildSystemPrompt("en");

// ─── User prompt builder ──────────────────────────────────────────────

export function buildUserPrompt({
  idea,
  clarifications,
  scopeLevel,
  profileContext = "",
  locale = "en",
}) {
  const parts = [`IDEA: ${idea}`];

  if (clarifications?.length) {
    const clarifyLines = clarifications
      .filter((c) => c.answer?.trim())
      .map((c) => `Q: ${c.question}\nA: ${c.answer}`)
      .join("\n\n");
    if (clarifyLines) parts.push(`ADDITIONAL CONTEXT:\n${clarifyLines}`);
  }

  parts.push(`SCOPE LEVEL: ${scopeLevel ?? "standard"}`);

  if (locale && locale !== "en") {
    const name = LANGUAGE_NAMES[locale] || locale;
    parts.push(`LANGUAGE: Write all values in ${name}.`);
  }

  if (profileContext?.trim()) parts.push(profileContext.trim());

  return parts.join("\n\n");
}

// ─── Clarify questions prompt ─────────────────────────────────────────

export function buildClarifyPrompt(idea, locale = "en") {
  const lang =
    locale && locale !== "en"
      ? `\nIMPORTANT: Write the question and placeholder values in ${
          LANGUAGE_NAMES[locale] || locale
        }. Do not use English for field values.\n`
      : "";

  return `You are helping a user plan: "${idea}"
${lang}
Generate exactly 3 clarifying questions. Each question must:
- Be under 12 words
- Be answerable in one sentence
- Change the plan meaningfully if answered differently
- NOT ask something already answered in the idea above

Question selection rules:
Q1 — The most important unknown that would change the plan structure (scope, phases, or timeline)
Q2 — The single most likely constraint: time per week, budget, skill gap, or access to tools/people
Q3 — The riskiest or most uncertain first step (skip if obvious — ask about the second-biggest unknown instead)

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

export function buildReengagePrompt(project, locale = "en") {
  const idleDays = Math.floor(
    (Date.now() - new Date(project.lastActivityAt)) / 86400000
  );
  const done = project.tasks?.filter((t) => t.status === "done").length ?? 0;
  const total = project.tasks?.length ?? 0;
  const activeBlockers =
    project.blockers?.filter((b) => b.status === "active") ?? [];
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

  const langNote =
    locale && locale !== "en"
      ? `\nRespond in ${LANGUAGE_NAMES[locale] || locale}.\n`
      : "";

  return `${context}
${langNote}
Write ONE specific action the user can do in the next 30 minutes to regain momentum.
Rules:
- Start with a verb
- Reference the actual project domain or the next task by name if available
- Avoid generic advice ("just start", "take a small step") — name a concrete action
- Max 2 sentences. Be direct and encouraging.`;
}
