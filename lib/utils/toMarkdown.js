/**
 * lib/utils/toMarkdown.js
 * Single source of truth for project → Markdown conversion.
 * Used by: exportMarkdown.js, export-email/route.js, export/route.js
 */

export function toMarkdown(p) {
  const lines = [];

  lines.push(`# ${p.projectTitle || "Untitled"}`);
  lines.push("");
  if (p.oneLineGoal) lines.push(`> ${p.oneLineGoal}`);
  lines.push(`*Exported from Momentum on ${new Date().toLocaleDateString()}*`);
  lines.push("");

  if (p.problemStatement) {
    lines.push("## Problem");
    lines.push(p.problemStatement);
    lines.push("");
  }

  if (p.targetUser) {
    lines.push(`**Target user:** ${p.targetUser}`);
    lines.push("");
  }

  if (p.successCriteria?.length) {
    lines.push("## Success Criteria");
    p.successCriteria.forEach((c) => lines.push(`- ${c}`));
    lines.push("");
  }

  const { mustHave = [], niceToHave = [], outOfScope = [] } = p.scope ?? {};
  if (mustHave.length || niceToHave.length || outOfScope.length) {
    lines.push("## Scope");
    if (mustHave.length) {
      lines.push("**Must have**");
      mustHave.forEach((s) => lines.push(`- ${s}`));
    }
    if (niceToHave.length) {
      lines.push("**Nice to have**");
      niceToHave.forEach((s) => lines.push(`- ${s}`));
    }
    if (outOfScope.length) {
      lines.push("**Out of scope**");
      outOfScope.forEach((s) => lines.push(`- ${s}`));
    }
    lines.push("");
  }

  p.phases?.forEach((phase, i) => {
    lines.push(`## Phase ${i + 1}: ${phase.name}`);
    if (phase.objective) lines.push(phase.objective);
    lines.push("");

    phase.milestones?.forEach((m) => {
      lines.push(`### ${m.name}`);
      if (m.deadline) lines.push(`**Deadline:** ${m.deadline}`);
      if (m.doneWhen) lines.push(`**Done when:** ${m.doneWhen}`);
      if (m.risk) lines.push(`**Risk:** ${m.risk}`);
      lines.push("");

      const milestoneTasks =
        p.tasks?.filter((t) => t.milestoneId === m.id) ?? [];
      milestoneTasks.forEach((t) => {
        lines.push(`- [${t.status === "done" ? "x" : " "}] ${t.title}`);
      });
      if (milestoneTasks.length) lines.push("");
    });

    const looseTasks =
      p.tasks?.filter((t) => t.phaseId === phase.id && !t.milestoneId) ?? [];
    if (looseTasks.length) {
      lines.push("**Tasks**");
      looseTasks.forEach((t) => {
        lines.push(`- [${t.status === "done" ? "x" : " "}] ${t.title}`);
      });
      lines.push("");
    }
  });

  const activeBlockers = p.blockers?.filter((b) => b.status === "active") ?? [];
  if (activeBlockers.length) {
    lines.push("## Active Blockers");
    activeBlockers.forEach((b) => lines.push(`- ${b.description}`));
    lines.push("");
  }

  if (p.toolsSuggested?.length) {
    lines.push("## Suggested Tools");
    p.toolsSuggested.forEach((t) => lines.push(`- ${t}`));
    lines.push("");
  }

  if (p.dailyNextAction) {
    lines.push("## Today's Next Action");
    lines.push(p.dailyNextAction);
    lines.push("");
  }

  if (p.postmortem?.answers?.length) {
    lines.push("## Retrospective");
    p.postmortem.answers.forEach((a) => {
      lines.push(`**${a.question}**`);
      lines.push(a.answer || "—");
      lines.push("");
    });
  }

  return lines.join("\n");
}

export function projectSlug(title) {
  return (
    (title || "project")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "momentum-project"
  );
}
