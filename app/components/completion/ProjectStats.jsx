"use client";

export function ProjectStats({ project }) {
  const stats = project.postmortem?.stats ?? {};
  const milestones = project.phases.flatMap((p) => p.milestones);

  const items = [
    {
      label: "Days to complete",
      value: stats.daysToComplete ?? 0,
      suffix: "d",
      color: "var(--violet)",
    },
    {
      label: "Tasks completed",
      value: stats.tasksCompleted ?? 0,
      color: "var(--emerald)",
    },
    {
      label: "Blockers hit",
      value: stats.blockersHit ?? 0,
      color: "var(--coral)",
    },
    {
      label: "Milestones on time",
      value: stats.milestonesOnTime ?? 0,
      color: "var(--emerald)",
    },
    {
      label: "Milestones missed",
      value: stats.milestonesMissed ?? 0,
      color: "var(--amber)",
    },
    {
      label: "Peak streak",
      value: project.streakDays ?? 0,
      suffix: "d 🔥",
      color: "var(--amber)",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map(({ label, value, suffix = "", color }) => (
        <div
          key={label}
          className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4"
        >
          <p className="text-xs text-[var(--text-tertiary)] mb-2">{label}</p>
          <p className="font-display font-semibold text-2xl" style={{ color }}>
            {value}
            {suffix}
          </p>
        </div>
      ))}
    </div>
  );
}
