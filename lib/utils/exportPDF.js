"use client";

/**
 * lib/utils/exportPDF.js
 *
 * Multilingual PDF export — uses browser print instead of jsPDF font embedding.
 *
 * Why this approach:
 * - jsPDF requires TTF files to be self-hosted AND base64-embedded per font/weight/script.
 *   Bengali, Arabic, Chinese each need separate font files that must exist at /public/fonts/.
 *   If those files are missing the export silently renders boxes.
 * - The browser already knows how to render every script using system fonts + Google Fonts.
 * - Opening a styled HTML page in a new tab and triggering window.print() produces a
 *   pixel-perfect, fully multilingual PDF via the OS print dialog (Save as PDF).
 * - No font files to host, no base64 encoding, no jsPDF dependency for this feature.
 */

function slug(title) {
  return (
    (title || "project")
      .toLowerCase()
      .replace(/[^a-z0-9\u0080-\uFFFF]+/g, "-")
      .replace(/^-|-$/g, "") || "momentum-project"
  );
}

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function progress(project) {
  const total = project.tasks?.length ?? 0;
  if (!total) return 0;
  const done = project.tasks.filter((t) => t.status === "done").length;
  return Math.round((done / total) * 100);
}

function buildHTML(project) {
  const pct = progress(project);
  const doneTasks =
    project.tasks?.filter((t) => t.status === "done").length ?? 0;
  const totalTasks = project.tasks?.length ?? 0;
  const activeBlockers =
    project.blockers?.filter((b) => b.status === "active") ?? [];
  const scopeLabel =
    { lean: "Lean", standard: "Standard", ambitious: "Ambitious" }[
      project.scopeLevel
    ] || "Standard";

  const phasesHTML = (project.phases ?? [])
    .map((phase, pi) => {
      const phaseTasks = (project.tasks ?? []).filter(
        (t) => t.phaseId === phase.id
      );
      const statusClass =
        phase.status === "done"
          ? "status-done"
          : phase.status === "active"
          ? "status-active"
          : "status-upcoming";
      const statusLabel =
        phase.status === "done"
          ? "Done"
          : phase.status === "active"
          ? "Active"
          : "Upcoming";

      const milestonesHTML = (phase.milestones ?? [])
        .map(
          (m) => `
        <div class="milestone">
          <div class="milestone-name">${esc(m.name)}</div>
          ${
            m.deadline
              ? `<div class="milestone-meta">⏰ Deadline: ${esc(
                  m.deadline
                )}</div>`
              : ""
          }
          ${
            m.doneWhen
              ? `<div class="milestone-meta">✓ Done when: ${esc(
                  m.doneWhen
                )}</div>`
              : ""
          }
          ${
            m.risk
              ? `<div class="milestone-meta risk">⚠ Risk: ${esc(m.risk)}</div>`
              : ""
          }
        </div>`
        )
        .join("");

      const tasksHTML = phaseTasks
        .map((t) => {
          const done = t.status === "done";
          return `<div class="task ${done ? "task-done" : ""}">
          <span class="task-icon">${done ? "✓" : "○"}</span>
          <span class="task-title">${esc(t.title)}</span>
        </div>`;
        })
        .join("");

      return `
      <div class="phase">
        <div class="phase-header">
          <div class="phase-num">${pi + 1}</div>
          <div class="phase-info">
            <div class="phase-name">${esc(phase.name)}</div>
            <span class="status-badge ${statusClass}">${statusLabel}</span>
          </div>
        </div>
        ${
          phase.objective
            ? `<div class="phase-objective">${esc(phase.objective)}</div>`
            : ""
        }
        ${
          milestonesHTML
            ? `<div class="milestones-section"><div class="subsection-label">Milestones</div>${milestonesHTML}</div>`
            : ""
        }
        ${
          tasksHTML
            ? `<div class="tasks-section"><div class="subsection-label">Tasks</div>${tasksHTML}</div>`
            : ""
        }
      </div>`;
    })
    .join("");

  const successHTML = (project.successCriteria ?? [])
    .map((c) => `<li>✓ ${esc(c)}</li>`)
    .join("");

  const scope = project.scope ?? {};
  const scopeHTML = [
    ...(scope.mustHave ?? []).map((s) => `<li class="must">● ${esc(s)}</li>`),
    ...(scope.niceToHave ?? []).map((s) => `<li class="nice">◦ ${esc(s)}</li>`),
    ...(scope.outOfScope ?? []).map((s) => `<li class="out">✕ ${esc(s)}</li>`),
  ].join("");

  const blockersHTML = activeBlockers
    .map((b) => `<div class="blocker">⊘ ${esc(b.description)}</div>`)
    .join("");

  const toolsHTML = (project.toolsSuggested ?? [])
    .map((t) => `<span class="tool-tag">${esc(t)}</span>`)
    .join("");

  const retroHTML = (project.postmortem?.answers ?? [])
    .map(
      (a) => `
    <div class="retro-item">
      <div class="retro-q">${esc(a.question)}</div>
      <div class="retro-a">${esc(a.answer || "—")}</div>
    </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(project.projectTitle)} — Momentum</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700&family=Noto+Naskh+Arabic:wght@400;600;700&family=Noto+Sans+SC:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', 'Noto Sans', 'Noto Sans Bengali', 'Noto Naskh Arabic', 'Noto Sans SC', sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #1a1a2e;
    background: #fff;
  }

  /* ── Print layout ── */
  @page {
    size: A4;
    margin: 14mm 16mm 12mm 16mm;
  }

  @media print {
    body { background: #fff; }
    .no-print { display: none !important; }
    .phase { page-break-inside: avoid; }
    h2 { page-break-after: avoid; }
  }

  /* ── Print button (non-print only) ── */
  .print-bar {
    position: fixed; top: 0; left: 0; right: 0;
    background: #6c63d4; color: #fff; padding: 10px 20px;
    display: flex; align-items: center; justify-between; gap: 12px;
    z-index: 999; font-size: 13px; font-weight: 500;
  }
  .print-bar button {
    background: #fff; color: #6c63d4; border: none;
    padding: 6px 18px; border-radius: 6px; cursor: pointer;
    font-size: 13px; font-weight: 600;
  }
  .print-bar button:hover { background: #eeedfe; }
  .spacer { flex: 1; }

  /* ── Cover header ── */
  .cover {
    background: linear-gradient(135deg, #6c63d4 0%, #4a43b0 100%);
    color: #fff;
    padding: 24px 24px 20px;
    border-radius: 8px;
    margin-bottom: 20px;
  }
  .cover-label {
    font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1px;
    opacity: 0.75; margin-bottom: 6px;
  }
  .cover-title {
    font-size: 20pt; font-weight: 700; line-height: 1.2; margin-bottom: 6px;
  }
  .cover-goal {
    font-size: 10pt; opacity: 0.88; font-style: italic;
  }
  .cover-meta {
    margin-top: 12px; font-size: 8pt; opacity: 0.72;
  }

  /* ── Stats row ── */
  .stats-row {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
    margin-bottom: 18px;
  }
  .stat-box {
    border: 1px solid #e0e0ee; border-radius: 8px; padding: 10px;
    text-align: center; background: #fafafe;
  }
  .stat-value {
    font-size: 18pt; font-weight: 700; color: #6c63d4; line-height: 1.1;
  }
  .stat-value.green { color: #1a9467; }
  .stat-value.amber { color: #b47010; }
  .stat-value.coral { color: #c84828; }
  .stat-label { font-size: 7pt; color: #888; text-transform: uppercase; margin-top: 2px; }

  /* ── Section heading ── */
  .section-head {
    font-size: 7.5pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.8px; color: #6c63d4;
    background: #f0effd; padding: 5px 10px;
    border-left: 3px solid #6c63d4; border-radius: 0 4px 4px 0;
    margin: 18px 0 10px;
  }

  /* ── Success criteria ── */
  .success-list { list-style: none; display: flex; flex-direction: column; gap: 4px; }
  .success-list li { font-size: 9.5pt; color: #2a2a3e; padding-left: 4px; }

  /* ── Scope ── */
  .scope-list { list-style: none; display: flex; flex-direction: column; gap: 3px; }
  .scope-list li { font-size: 9pt; padding: 2px 0; }
  .scope-list li.must { color: #1a1a2e; }
  .scope-list li.nice { color: #555; }
  .scope-list li.out { color: #b44; text-decoration: line-through; }

  /* ── Phases ── */
  .phase {
    border: 1px solid #e8e8f0; border-radius: 8px; padding: 14px 16px;
    margin-bottom: 12px; background: #fafafe;
  }
  .phase-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
  .phase-num {
    width: 24px; height: 24px; border-radius: 50%;
    background: #6c63d4; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 9pt; font-weight: 700; flex-shrink: 0;
  }
  .phase-name { font-size: 11pt; font-weight: 700; color: #1a1a2e; }
  .phase-info { flex: 1; }
  .phase-objective { font-size: 9pt; color: #555; font-style: italic; margin-bottom: 8px; }

  .status-badge {
    display: inline-block; font-size: 7pt; font-weight: 600;
    padding: 2px 8px; border-radius: 10px; text-transform: uppercase;
    letter-spacing: 0.5px; margin-top: 3px;
  }
  .status-active { background: #eeedfe; color: #4a43b0; }
  .status-done { background: #e0f5ed; color: #1a9467; }
  .status-upcoming { background: #f0f0f4; color: #888; }

  /* ── Milestones ── */
  .milestones-section { margin-top: 8px; }
  .subsection-label {
    font-size: 7pt; text-transform: uppercase; font-weight: 700;
    color: #6c63d4; letter-spacing: 0.5px; margin-bottom: 5px;
  }
  .milestone {
    border-left: 2px solid #dddcf8; padding: 4px 0 4px 10px;
    margin-bottom: 6px;
  }
  .milestone-name { font-size: 9.5pt; font-weight: 600; color: #1a1a2e; }
  .milestone-meta { font-size: 8pt; color: #666; margin-top: 2px; }
  .milestone-meta.risk { color: #c84828; }

  /* ── Tasks ── */
  .tasks-section { margin-top: 8px; }
  .task { display: flex; align-items: baseline; gap: 6px; padding: 2px 0; }
  .task-icon { font-size: 9pt; color: #aaa; flex-shrink: 0; }
  .task.task-done .task-icon { color: #1a9467; }
  .task-title { font-size: 9pt; color: #2a2a3e; }
  .task.task-done .task-title { text-decoration: line-through; color: #999; }

  /* ── Next action ── */
  .next-action-box {
    border: 2px solid #1a9467; border-radius: 8px; padding: 12px 14px;
    background: #e8f7f1;
  }
  .next-action-text { font-size: 10.5pt; color: #1a2e1a; font-weight: 600; }

  /* ── Blockers ── */
  .blocker {
    border: 1px solid #f4c0aa; border-radius: 6px;
    padding: 6px 10px; background: #fdf0ec; color: #7a2a10;
    font-size: 9.5pt; margin-bottom: 6px;
  }

  /* ── Tools ── */
  .tools-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
  .tool-tag {
    background: #f0f0f8; border: 1px solid #dddcf8;
    padding: 3px 8px; border-radius: 4px; font-size: 8.5pt; color: #444;
  }

  /* ── Retro ── */
  .retro-item { border-bottom: 1px solid #eee; padding: 8px 0; }
  .retro-item:last-child { border-bottom: none; }
  .retro-q { font-size: 9.5pt; font-weight: 600; color: #1a1a2e; margin-bottom: 3px; }
  .retro-a { font-size: 9pt; color: #555; }

  /* ── Footer ── */
  .pdf-footer {
    margin-top: 24px; padding-top: 10px; border-top: 1px solid #eee;
    font-size: 8pt; color: #aaa; text-align: center;
  }
</style>
</head>
<body>

<!-- Print bar (hidden when printing) -->
<div class="print-bar no-print">
  <span>Your project is ready to save as PDF</span>
  <span class="spacer"></span>
  <button onclick="window.print()">🖨 Save as PDF</button>
</div>

<!-- Offset for print bar -->
<div class="no-print" style="height:48px"></div>

<!-- Cover -->
<div class="cover">
  <div class="cover-label">Momentum — Project Blueprint</div>
  <div class="cover-title">${esc(
    project.projectTitle || "Untitled Project"
  )}</div>
  ${
    project.oneLineGoal
      ? `<div class="cover-goal">${esc(project.oneLineGoal)}</div>`
      : ""
  }
  <div class="cover-meta">
    ${scopeLabel} scope
    ${project.phases?.length ? ` · ${project.phases.length} phases` : ""}
    ${totalTasks ? ` · ${totalTasks} tasks` : ""}
    ${project.timeline ? ` · ${esc(project.timeline)}` : ""}
    ${project.estimatedEffort ? ` · ${esc(project.estimatedEffort)}` : ""}
    · Exported ${formatDate(new Date().toISOString())}
  </div>
</div>

<!-- Stats -->
<div class="stats-row">
  <div class="stat-box">
    <div class="stat-value">${pct}%</div>
    <div class="stat-label">Progress</div>
  </div>
  <div class="stat-box">
    <div class="stat-value green">${doneTasks}/${totalTasks}</div>
    <div class="stat-label">Tasks Done</div>
  </div>
  <div class="stat-box">
    <div class="stat-value ${activeBlockers.length > 0 ? "coral" : "green"}">${
    activeBlockers.length
  }</div>
    <div class="stat-label">Blockers</div>
  </div>
  <div class="stat-box">
    <div class="stat-value amber">${project.streakDays ?? 0}d</div>
    <div class="stat-label">Streak</div>
  </div>
</div>

${
  project.problemStatement
    ? `
<div class="section-head">Problem Statement</div>
<p style="font-size:9.5pt;color:#444;line-height:1.6">${esc(
        project.problemStatement
      )}</p>
`
    : ""
}

${
  successHTML
    ? `
<div class="section-head">Success Criteria</div>
<ul class="success-list">${successHTML}</ul>
`
    : ""
}

${
  scopeHTML
    ? `
<div class="section-head">Scope</div>
<ul class="scope-list">${scopeHTML}</ul>
`
    : ""
}

${
  phasesHTML
    ? `
<div class="section-head">Project Phases</div>
${phasesHTML}
`
    : ""
}

${
  project.dailyNextAction
    ? `
<div class="section-head">Today's Next Action</div>
<div class="next-action-box">
  <div class="next-action-text">${esc(project.dailyNextAction)}</div>
</div>
`
    : ""
}

${
  blockersHTML
    ? `
<div class="section-head">Active Blockers</div>
${blockersHTML}
`
    : ""
}

${
  toolsHTML
    ? `
<div class="section-head">Suggested Tools</div>
<div class="tools-wrap">${toolsHTML}</div>
`
    : ""
}

${
  retroHTML
    ? `
<div class="section-head">Retrospective</div>
${retroHTML}
`
    : ""
}

<div class="pdf-footer">
  ${esc(project.projectTitle)} · Exported from Momentum · ${formatDate(
    new Date().toISOString()
  )}
</div>

<script>
  // Auto-trigger print after fonts load
  if (document.fonts) {
    document.fonts.ready.then(function() {
      // Small delay so user can see the page first
      setTimeout(function() { window.print(); }, 400);
    });
  }
</script>
</body>
</html>`;
}

export async function exportProjectPDF(project) {
  const html = buildHTML(project);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const win = window.open(url, "_blank");

  // Revoke the object URL after the window has loaded it
  if (win) {
    win.addEventListener("load", () => {
      URL.revokeObjectURL(url);
    });
  } else {
    // Popup blocked — fall back to a download link
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(project.projectTitle || "momentum-project")}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
