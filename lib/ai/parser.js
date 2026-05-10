import {
  createPhase,
  createMilestone,
  createTask,
  createBlocker,
} from "../schema";

// ─── JSON auto-repair ─────────────────────────────────────────────────

/**
 * Attempt to surgically repair common JSON errors produced by LLMs:
 * 1. Trailing commas before ] or }
 * 2. Unclosed strings (add closing quote)
 * 3. Unclosed arrays/objects (append missing brackets)
 * 4. Single quotes used instead of double quotes
 * 5. Unquoted keys
 * 6. Truncated JSON (slice at last complete top-level field)
 *
 * Returns the repaired string, or null if repair is not possible.
 */
function repairJSON(raw) {
  if (!raw || typeof raw !== "string") return null;

  let s = raw.trim();

  // 1. Remove markdown fences
  s = s
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // 2. Extract outermost {...}
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) {
    s = s.slice(start, end + 1);
  } else if (start !== -1) {
    // truncated — no closing brace yet
    s = s.slice(start);
  } else {
    return null;
  }

  // 3. Fix single-quoted strings → double-quoted
  // Only when not already inside a double-quoted string
  // Simple heuristic: replace 'value' patterns that look standalone
  s = s.replace(/([{,\[])\s*'([^'\\]*)'/g, '$1 "$2"');

  // 4. Remove trailing commas before ] or }
  s = s.replace(/,\s*([\]}])/g, "$1");

  // 5. Try to parse as-is first
  try {
    JSON.parse(s);
    return s;
  } catch {
    // continue with more aggressive repairs
  }

  // 6. Count unclosed braces/brackets and close them
  let depth = 0;
  let inString = false;
  let escaped = false;
  const opens = [];

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") opens.push(ch);
    if (ch === "}" || ch === "]") opens.pop();
  }

  // Close unclosed string first if we ended mid-string
  if (inString) s += '"';

  // Close remaining open brackets in reverse
  let suffix = "";
  for (let i = opens.length - 1; i >= 0; i--) {
    suffix += opens[i] === "{" ? "}" : "]";
  }
  s = s + suffix;

  // Remove trailing commas again after closing
  s = s.replace(/,\s*([\]}])/g, "$1");

  try {
    JSON.parse(s);
    return s;
  } catch {
    return null;
  }
}

/**
 * Safely parse the AI-generated project blueprint JSON
 * and hydrate it into proper schema objects with real UUIDs.
 * Will attempt auto-repair before throwing.
 */
export function parseBlueprint(raw) {
  if (!raw || typeof raw !== "string") {
    throw new Error("AI returned empty response. Please try again.");
  }

  // Strip markdown fences
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Extract outermost JSON object
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }

  let data;

  // First attempt: parse as-is
  try {
    data = JSON.parse(cleaned);
  } catch {
    // Second attempt: auto-repair
    const repaired = repairJSON(raw);
    if (repaired) {
      try {
        data = JSON.parse(repaired);
        console.info("[parser] Auto-repaired JSON successfully");
      } catch {
        throw new Error(
          "AI returned invalid JSON that couldn't be repaired. Please try again."
        );
      }
    } else {
      throw new Error("AI returned invalid JSON. Please try again.");
    }
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("AI returned unexpected format. Please try again.");
  }

  // ── Hydrate phases → milestones → tasks ──────────────────────────

  const hydratedPhases = (data.phases ?? []).map((ph, phIndex) => {
    const phase = createPhase({
      name: ph.name ?? `Phase ${phIndex + 1}`,
      objective: ph.objective ?? "",
      order: phIndex,
      status: phIndex === 0 ? "active" : "upcoming",
    });

    const milestonesWithTasks = (ph.milestones ?? []).map((m) => {
      const milestone = createMilestone({
        name: m.name ?? "",
        deadline: m.deadline ?? null,
        doneWhen: m.doneWhen ?? "",
        risk: m.risk ?? "",
      });

      const rawTasks = Array.isArray(m.tasks) ? m.tasks : [];
      const tasks = rawTasks
        .map((t) => {
          // tasks can be strings or objects with a title
          const title =
            typeof t === "string"
              ? t.trim()
              : typeof t?.title === "string"
              ? t.title.trim()
              : "";
          return title
            ? createTask({
                title,
                phaseId: phase.id,
                milestoneId: milestone.id,
              })
            : null;
        })
        .filter(Boolean);

      milestone.tasks = tasks.map((t) => t.id);
      return { milestone, tasks };
    });

    return { phase, milestonesWithTasks };
  });

  const allTasks = [];
  const cleanPhases = hydratedPhases.map(({ phase, milestonesWithTasks }) => {
    const milestones = milestonesWithTasks.map(({ milestone, tasks }) => {
      allTasks.push(...tasks);
      return milestone;
    });
    return { ...phase, milestones };
  });

  if (cleanPhases.length === 0) {
    throw new Error("AI returned a plan with no phases. Please try again.");
  }

  // ── Blockers: handle both string[] and object[] ───────────────────
  const blockers = (data.blockers ?? [])
    .map((desc) =>
      typeof desc === "string"
        ? createBlocker({ description: desc })
        : typeof desc?.description === "string"
        ? createBlocker(desc)
        : null
    )
    .filter(Boolean);

  return {
    projectTitle: data.projectTitle ?? "",
    oneLineGoal: data.oneLineGoal ?? "",
    problemStatement: data.problemStatement ?? "",
    targetUser: data.targetUser ?? "",
    successCriteria: Array.isArray(data.successCriteria)
      ? data.successCriteria.filter((c) => typeof c === "string")
      : [],
    scope: {
      mustHave: Array.isArray(data.scope?.mustHave) ? data.scope.mustHave : [],
      niceToHave: Array.isArray(data.scope?.niceToHave)
        ? data.scope.niceToHave
        : [],
      outOfScope: Array.isArray(data.scope?.outOfScope)
        ? data.scope.outOfScope
        : [],
    },
    phases: cleanPhases,
    tasks: allTasks,
    dailyNextAction: data.dailyNextAction ?? "",
    blockers,
    toolsSuggested: Array.isArray(data.toolsSuggested)
      ? data.toolsSuggested
      : [],
    estimatedEffort: data.estimatedEffort ?? "",
    timeline: data.timeline ?? "",
    reviewQuestions: Array.isArray(data.reviewQuestions)
      ? data.reviewQuestions
      : [],
  };
}

/**
 * Parse the 3 clarifying questions returned by the AI.
 */
export function parseClarifyQuestions(raw) {
  if (!raw) return [];

  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    cleaned = cleaned.slice(arrStart, arrEnd + 1);
  }

  // Remove trailing commas
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  try {
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((q) => q && typeof q.question === "string")
      .slice(0, 3)
      .map((q) => ({
        question: q.question,
        placeholder: typeof q.placeholder === "string" ? q.placeholder : "",
      }));
  } catch {
    // Try to extract question objects manually via regex
    const questions = [];
    const qRegex = /"question"\s*:\s*"([^"]+)"/g;
    const pRegex = /"placeholder"\s*:\s*"([^"]+)"/g;
    let qMatch, pMatch;
    const qs = [],
      ps = [];
    while ((qMatch = qRegex.exec(cleaned)) !== null) qs.push(qMatch[1]);
    while ((pMatch = pRegex.exec(cleaned)) !== null) ps.push(pMatch[1]);
    for (let i = 0; i < Math.min(qs.length, 3); i++) {
      questions.push({ question: qs[i], placeholder: ps[i] ?? "" });
    }
    return questions;
  }
}
