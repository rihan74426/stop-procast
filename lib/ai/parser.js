import {
  createPhase,
  createMilestone,
  createTask,
  createBlocker,
} from "../schema";

/**
 * Safely parse the AI-generated project blueprint JSON
 * and hydrate it into proper schema objects with real UUIDs.
 */
export function parseBlueprint(raw) {
  if (!raw || typeof raw !== "string") {
    throw new Error("AI returned empty response. Please try again.");
  }

  let data;

  // Strip markdown fences and leading/trailing whitespace
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Sometimes the model prepends a sentence before the JSON
  // Find the first '{' to extract just the JSON object
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }

  try {
    data = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(
      `AI returned invalid JSON. Please try again. (${e.message})`
    );
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("AI returned unexpected format. Please try again.");
  }

  // Hydrate phases → milestones → tasks
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

      // Tasks returned as strings — hydrate them
      const tasks = (m.tasks ?? [])
        .filter((t) => typeof t === "string" && t.trim())
        .map((title) =>
          createTask({
            title: title.trim(),
            phaseId: phase.id,
            milestoneId: milestone.id,
          })
        );
      milestone.tasks = tasks.map((t) => t.id);

      return { milestone, tasks };
    });

    return { phase, milestonesWithTasks };
  });

  // Flatten all tasks across phases
  const allTasks = [];
  const cleanPhases = hydratedPhases.map(({ phase, milestonesWithTasks }) => {
    const milestones = milestonesWithTasks.map(({ milestone, tasks }) => {
      allTasks.push(...tasks);
      return milestone;
    });
    return { ...phase, milestones };
  });

  // Require at least one phase
  if (cleanPhases.length === 0) {
    throw new Error("AI returned a plan with no phases. Please try again.");
  }

  // Hydrate anticipated blockers
  const blockers = (data.blockers ?? []).map((desc) =>
    typeof desc === "string"
      ? createBlocker({ description: desc })
      : createBlocker(desc)
  );

  return {
    projectTitle: data.projectTitle ?? "",
    oneLineGoal: data.oneLineGoal ?? "",
    problemStatement: data.problemStatement ?? "",
    targetUser: data.targetUser ?? "",
    successCriteria: Array.isArray(data.successCriteria)
      ? data.successCriteria
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

  // Find the JSON array
  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    cleaned = cleaned.slice(arrStart, arrEnd + 1);
  }

  try {
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) return [];
    return arr.filter((q) => q && typeof q.question === "string").slice(0, 3);
  } catch {
    return [];
  }
}
