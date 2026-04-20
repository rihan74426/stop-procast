// ─── Task progress ────────────────────────────────────────────────────

export function taskProgress(tasks = []) {
  if (!tasks.length) return 0;
  const done = tasks.filter((t) => t.status === "done").length;
  return Math.round((done / tasks.length) * 100);
}

// ─── Phase progress (tasks within a phase) ───────────────────────────

export function phaseProgress(project, phaseId) {
  const tasks = project.tasks.filter((t) => t.phaseId === phaseId);
  return taskProgress(tasks);
}

// ─── Overall project progress ─────────────────────────────────────────

export function overallProgress(project) {
  return taskProgress(project.tasks);
}

// ─── Milestone progress ───────────────────────────────────────────────

export function milestoneProgress(project, milestone) {
  const tasks = milestone.tasks
    .map((id) => project.tasks.find((t) => t.id === id))
    .filter(Boolean);
  return taskProgress(tasks);
}

// ─── Active phase (first non-done phase) ─────────────────────────────

export function activePhase(project) {
  return (
    project.phases.find((p) => p.status === "active") ??
    project.phases.find((p) => p.status === "upcoming") ??
    null
  );
}

// ─── Next action (first todo/doing task in active phase) ──────────────

export function nextAction(project) {
  if (project.dailyNextAction) return project.dailyNextAction;

  const phase = activePhase(project);
  if (!phase) return null;

  const task = project.tasks.find(
    (t) =>
      t.phaseId === phase.id && (t.status === "todo" || t.status === "doing")
  );
  return task?.title ?? null;
}

// ─── Completed tasks count ────────────────────────────────────────────

export function completedTasksCount(project) {
  return project.tasks.filter((t) => t.status === "done").length;
}
