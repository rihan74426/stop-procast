import {
  createPhase,
  createMilestone,
  createTask,
  createBlocker,
} from "../schema";

// ─── JSON auto-repair ─────────────────────────────────────────────────

function repairJSON(raw) {
  if (!raw || typeof raw !== "string") return null;

  let s = raw.trim();

  // Remove markdown fences
  s = s
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Extract outermost {...}
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) {
    s = s.slice(start, end + 1);
  } else if (start !== -1) {
    s = s.slice(start);
  } else {
    return null;
  }

  // Fix single-quoted strings
  s = s.replace(/([{,\[])\s*'([^'\\]*)'/g, '$1 "$2"');

  // Remove trailing commas before ] or }
  s = s.replace(/,\s*([\]}])/g, "$1");

  // Try parse as-is
  try {
    JSON.parse(s);
    return s;
  } catch {
    // continue
  }

  // Fix common issues from multilingual models:
  // 1. Missing closing quote on value before comma/newline
  //    e.g.  "doneWhen" সেমিনারের  -> need to quote the value
  // 2. Missing colon after key  e.g. "risk ফেসবুক"
  // 3. Keys without quotes followed by colon

  // Fix: "key value" (missing colon) -> "key": "value"
  s = s.replace(/"([^"]+)\s+([^\s":,{}\[\]]+)"\s*(?=[,}\]])/g, '"$1": "$2"');

  // Fix: missing closing quote before colon on next line
  // "doneWhen" text without quote -> "doneWhen": "text"
  s = s.replace(/"(\w+)"\s+([^",:\n{}\[\]]+)\n/g, '"$1": "$2"\n');

  // Remove trailing commas again
  s = s.replace(/,\s*([\]}])/g, "$1");

  // Count unclosed braces/brackets and close them
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

  if (inString) s += '"';

  let suffix = "";
  for (let i = opens.length - 1; i >= 0; i--) {
    suffix += opens[i] === "{" ? "}" : "]";
  }
  s = s + suffix;

  s = s.replace(/,\s*([\]}])/g, "$1");

  try {
    JSON.parse(s);
    return s;
  } catch {
    return null;
  }
}

// ─── Garble detection ─────────────────────────────────────────────────

/**
 * Detects if the AI response is clearly garbage output from a weak model.
 * Signs: repeating patterns, mixed script gibberish, null content fields,
 * extremely short phase names, nonsense task text.
 */
function detectGarbledOutput(data) {
  // Check for nemotron reasoning loop (0.0.0.0 pattern)
  const rawStr = JSON.stringify(data);
  if (/0\.0\.0\.0\.0\.0\.0\.0/.test(rawStr)) return true;

  // No project title
  if (!data.projectTitle || data.projectTitle.trim().length < 2) return true;

  // No phases or empty phases
  if (!Array.isArray(data.phases) || data.phases.length === 0) return true;

  // Check for clearly broken tasks (very short, repetitive, contain HTML-like junk)
  const allTasks = data.phases.flatMap((p) =>
    (p.milestones || []).flatMap((m) => (Array.isArray(m.tasks) ? m.tasks : []))
  );

  if (allTasks.length > 0) {
    const brokenTasks = allTasks.filter((t) => {
      if (typeof t !== "string") return false;
      // Contains HTML remnants or code artifacts
      if (/[<>]|\]\.done\]|>font\]/.test(t)) return true;
      // Pure gibberish (no recognizable words, just random chars < 3 chars)
      if (t.trim().length < 3) return true;
      return false;
    });
    // If more than 30% of tasks are broken, reject
    if (brokenTasks.length / allTasks.length > 0.3) return true;
  }

  return false;
}

// ─── Blueprint parser ─────────────────────────────────────────────────

export function parseBlueprint(raw) {
  if (!raw || typeof raw !== "string") {
    throw new Error("AI returned empty response. Please try again.");
  }

  // Detect nemotron reasoning loop before any processing
  if (/0\.0\.0\.0\.0\.0\.0\.0/.test(raw)) {
    throw new Error("AI returned invalid response. Please try again.");
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

  // Detect garbled output from weak models
  if (detectGarbledOutput(data)) {
    throw new Error("AI returned low-quality output. Please try again.");
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
          const title =
            typeof t === "string"
              ? t.trim()
              : typeof t?.title === "string"
              ? t.title.trim()
              : "";
          // Filter out clearly broken tasks
          if (!title || title.length < 3) return null;
          if (/[<>]|\]\.done\]|>font\]/.test(title)) return null;
          return createTask({
            title,
            phaseId: phase.id,
            milestoneId: milestone.id,
          });
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
