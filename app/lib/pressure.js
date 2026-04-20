import { daysSince, isOverdue } from "./utils/date";
import { overallProgress } from "./utils/progress";

/**
 * Returns a pressure object describing the urgency state of a project.
 *
 * level: 'none' | 'low' | 'medium' | 'high' | 'critical'
 */
export function getPressure(project) {
  if (project.completionDate) return { level: "none", reasons: [] };

  const reasons = [];
  let score = 0;

  // Idle time
  const idle = daysSince(project.lastActivityAt);
  if (idle >= 14) {
    score += 40;
    reasons.push({ type: "idle", days: idle, severity: "critical" });
  } else if (idle >= 7) {
    score += 25;
    reasons.push({ type: "idle", days: idle, severity: "high" });
  } else if (idle >= 3) {
    score += 10;
    reasons.push({ type: "idle", days: idle, severity: "medium" });
  }

  // Missed milestones
  const missed = project.phases
    .flatMap((p) => p.milestones)
    .filter((m) => m.status !== "done" && m.deadline && isOverdue(m.deadline));
  if (missed.length > 0) {
    score += missed.length * 20;
    reasons.push({
      type: "missed_milestones",
      count: missed.length,
      severity: missed.length > 1 ? "critical" : "high",
    });
  }

  // Active blockers
  const activeBlockers = project.blockers.filter((b) => b.status === "active");
  if (activeBlockers.length > 0) {
    score += activeBlockers.length * 15;
    reasons.push({
      type: "blockers",
      count: activeBlockers.length,
      severity: "high",
    });
  }

  // Low progress on old project
  const age = daysSince(project.createdAt);
  const progress = overallProgress(project);
  if (age > 14 && progress < 20) {
    score += 15;
    reasons.push({ type: "low_progress", age, progress, severity: "medium" });
  }

  // Streak broken (streakDays === 0 but project has tasks)
  if (project.tasks.length > 0 && project.streakDays === 0 && idle > 1) {
    score += 5;
    reasons.push({ type: "streak_broken", severity: "low" });
  }

  const level =
    score >= 50
      ? "critical"
      : score >= 30
      ? "high"
      : score >= 15
      ? "medium"
      : score >= 5
      ? "low"
      : "none";

  return { level, score, reasons };
}

export const PRESSURE_COLORS = {
  none: "var(--emerald)",
  low: "var(--emerald)",
  medium: "var(--amber)",
  high: "var(--coral)",
  critical: "var(--coral)",
};

export const PRESSURE_LABELS = {
  none: "On track",
  low: "Slow momentum",
  medium: "Needs attention",
  high: "At risk",
  critical: "Stalled",
};
