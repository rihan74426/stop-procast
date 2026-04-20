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
  let data;

  // Strip markdown fences if present
  const cleaned = raw.replace(/```json|```/g, "").trim();

  try {
    data = JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  // Hydrate phases → milestones → tasks
  const hydratedPhases = (data.phases ?? []).map((ph, phIndex) => {
    const phase = createPhase({
      name: ph.name ?? `Phase ${phIndex + 1}`,
      objective: ph.objective ?? "",
      order: phIndex,
      status: phIndex === 0 ? "active" : "upcoming",
    });

    phase.milestones = (ph.milestones ?? []).map((m) => {
      const milestone = createMilestone({
        name: m.name ?? "",
        deadline: m.deadline ?? null,
        doneWhen: m.doneWhen ?? "",
        risk: m.risk ?? "",
      });

      // Tasks are returned as strings — hydrate them
      const tasks = (m.tasks ?? []).map((title) =>
        createTask({ title, phaseId: phase.id, milestoneId: milestone.id })
      );
      milestone.tasks = tasks.map((t) => t.id);

      return { milestone, tasks };
    });

    return { phase, milestonesWithTasks: phase.milestones };
  });

  // Flatten all tasks across phases
  const allTasks = [];
  const cleanPhases = hydratedPhases.map(({ phase, milestonesWithTasks }) => {
    const milestones = (milestonesWithTasks ?? []).map((entry) => {
      if (entry?.milestone) {
        allTasks.push(...(entry.tasks ?? []));
        return entry.milestone;
      }
      return entry;
    });
    return { ...phase, milestones };
  });

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
    successCriteria: data.successCriteria ?? [],
    scope: data.scope ?? { mustHave: [], niceToHave: [], outOfScope: [] },
    phases: cleanPhases,
    tasks: allTasks,
    dailyNextAction: data.dailyNextAction ?? "",
    blockers,
    toolsSuggested: data.toolsSuggested ?? [],
    estimatedEffort: data.estimatedEffort ?? "",
    timeline: data.timeline ?? "",
    reviewQuestions: data.reviewQuestions ?? [],
  };
}

/**
 * Parse the 3 clarifying questions returned by the AI.
 */
export function parseClarifyQuestions(raw) {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    const arr = JSON.parse(cleaned);
    return Array.isArray(arr) ? arr.slice(0, 3) : [];
  } catch {
    return [];
  }
}
