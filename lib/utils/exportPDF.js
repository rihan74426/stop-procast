"use client";

/**
 * Client-side PDF export using jsPDF (loaded dynamically).
 * No server required. Fully unicode-safe.
 * Add jspdf to package.json: npm install jspdf
 */
export async function exportProjectPDF(project) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;
  const LINE = 5.5;

  function checkPage(need = LINE * 2) {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function text(str, x, size, style = "normal", color = [30, 30, 40]) {
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(
      String(str || ""),
      contentW - (x - margin)
    );
    checkPage(lines.length * LINE);
    doc.text(lines, x, y);
    y += lines.length * LINE;
  }

  function sectionHeader(title) {
    y += 5;
    checkPage(10);
    doc.setFillColor(238, 237, 254);
    doc.roundedRect(margin, y - 3.5, contentW, 7, 1.5, 1.5, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(83, 74, 183);
    doc.text(title.toUpperCase(), margin + 3, y + 0.5);
    y += 6;
  }

  // ── Header ──────────────────────────────────────────────────────
  doc.setFillColor(127, 119, 221);
  doc.rect(0, 0, pageW, 32, "F");

  // App label
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.setGlobalAlpha?.(0.7);
  doc.text("MOMENTUM", margin, 9);
  doc.setGlobalAlpha?.(1);

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(
    project.projectTitle || "Untitled",
    contentW
  );
  doc.text(titleLines, margin, 19);
  y = 32 + 7;

  // One-line goal
  text(project.oneLineGoal, margin, 9.5, "italic", [80, 80, 110]);
  y += 3;

  // Meta
  const meta = [
    project.scopeLevel && `Scope: ${project.scopeLevel}`,
    project.estimatedEffort && `Effort: ${project.estimatedEffort}`,
    project.timeline && `Timeline: ${project.timeline}`,
    `${project.tasks?.length || 0} tasks`,
    `${project.phases?.length || 0} phases`,
  ]
    .filter(Boolean)
    .join("  ·  ");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 150);
  const metaLines = doc.splitTextToSize(meta, contentW);
  doc.text(metaLines, margin, y);
  y += metaLines.length * 4.5 + 2;

  // Divider
  doc.setDrawColor(220, 220, 235);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // ── Problem ────────────────────────────────────────────────────
  if (project.problemStatement) {
    sectionHeader("Problem Statement");
    text(project.problemStatement, margin, 9, "normal", [60, 60, 80]);
    y += 2;
  }
  if (project.targetUser) {
    text(
      `Target user: ${project.targetUser}`,
      margin,
      8.5,
      "italic",
      [100, 100, 130]
    );
    y += 2;
  }

  // ── Success Criteria ───────────────────────────────────────────
  if (project.successCriteria?.length) {
    sectionHeader("Success Criteria");
    project.successCriteria.forEach((c) => {
      checkPage(LINE);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(29, 158, 117);
      doc.text("✓", margin + 1, y);
      doc.setTextColor(50, 50, 70);
      const lines = doc.splitTextToSize(c, contentW - 9);
      doc.text(lines, margin + 7, y);
      y += lines.length * LINE;
    });
    y += 2;
  }

  // ── Scope ──────────────────────────────────────────────────────
  if (project.scope?.mustHave?.length || project.scope?.niceToHave?.length) {
    sectionHeader("Scope");
    if (project.scope.mustHave?.length) {
      text("Must have:", margin, 8.5, "bold", [50, 50, 70]);
      project.scope.mustHave.forEach((s) =>
        text(`  • ${s}`, margin, 8, "normal", [60, 60, 80])
      );
    }
    if (project.scope.niceToHave?.length) {
      text("Nice to have:", margin, 8.5, "bold", [100, 100, 130]);
      project.scope.niceToHave.forEach((s) =>
        text(`  • ${s}`, margin, 8, "normal", [100, 100, 130])
      );
    }
    if (project.scope.outOfScope?.length) {
      text("Out of scope:", margin, 8.5, "bold", [180, 100, 100]);
      project.scope.outOfScope.forEach((s) =>
        text(`  • ${s}`, margin, 8, "normal", [160, 100, 100])
      );
    }
  }

  // ── Phases ─────────────────────────────────────────────────────
  if (project.phases?.length) {
    sectionHeader("Project Phases");
    project.phases.forEach((phase, pi) => {
      checkPage(18);
      y += 2;

      // Phase pill
      doc.setFillColor(127, 119, 221);
      doc.circle(margin + 3.5, y - 1, 3.5, "F");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(String(pi + 1), margin + 2.2, y);

      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(25, 25, 45);
      doc.text(phase.name || `Phase ${pi + 1}`, margin + 9, y);
      y += LINE;

      if (phase.objective) {
        text(phase.objective, margin + 9, 8, "italic", [80, 80, 110]);
      }

      // Tasks
      const phaseTasks =
        project.tasks?.filter((t) => t.phaseId === phase.id) || [];
      if (phaseTasks.length) {
        y += 1;
        phaseTasks.forEach((task) => {
          checkPage(LINE);
          const done = task.status === "done";
          doc.setFontSize(8);
          doc.setFont("helvetica", done ? "italic" : "normal");
          doc.setTextColor(...(done ? [150, 150, 170] : [45, 45, 65]));
          const prefix = done ? "[✓]" : "[ ]";
          const tLines = doc.splitTextToSize(
            `${prefix} ${task.title}`,
            contentW - 14
          );
          checkPage(tLines.length * LINE);
          doc.text(tLines, margin + 11, y);
          y += tLines.length * LINE;
        });
      }

      y += 3;
      doc.setDrawColor(230, 230, 242);
      doc.line(margin + 5, y, pageW - margin, y);
      y += 3;
    });
  }

  // ── Active Blockers ────────────────────────────────────────────
  const blockers = project.blockers?.filter((b) => b.status === "active") || [];
  if (blockers.length) {
    sectionHeader("Active Blockers");
    blockers.forEach((b) => {
      checkPage(LINE);
      doc.setFontSize(9);
      doc.setTextColor(216, 90, 48);
      doc.text("⊘", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 80);
      const bl = doc.splitTextToSize(b.description, contentW - 7);
      doc.text(bl, margin + 6, y);
      y += bl.length * LINE;
    });
  }

  // ── Tools ──────────────────────────────────────────────────────
  if (project.toolsSuggested?.length) {
    sectionHeader("Suggested Tools");
    text(
      project.toolsSuggested.join("  ·  "),
      margin,
      8.5,
      "normal",
      [60, 60, 80]
    );
  }

  // ── Next Action ────────────────────────────────────────────────
  if (project.dailyNextAction) {
    sectionHeader("Today's Action");
    const naLines = doc.splitTextToSize(project.dailyNextAction, contentW - 8);
    const boxH = naLines.length * LINE + 8;
    checkPage(boxH + 4);
    doc.setFillColor(225, 245, 238);
    doc.roundedRect(margin, y - 4, contentW, boxH, 2, 2, "F");
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 110, 86);
    doc.text(naLines, margin + 4, y + 1.5);
    y += boxH;
  }

  // ── Retrospective ──────────────────────────────────────────────
  if (project.postmortem?.answers?.length) {
    sectionHeader("Retrospective");
    project.postmortem.answers.forEach((a) => {
      checkPage(LINE * 4);
      text(a.question, margin, 9, "bold", [45, 45, 65]);
      text(a.answer || "—", margin + 3, 8.5, "normal", [75, 75, 100]);
      y += 2;
    });
  }

  // ── Footer on each page ────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(170, 170, 190);
    doc.text(
      `Momentum — ${project.projectTitle} — ${new Date().toLocaleDateString()}`,
      margin,
      pageH - 7
    );
    doc.text(`${i} / ${totalPages}`, pageW - margin - 8, pageH - 7);
  }

  const filename =
    (project.projectTitle || "project")
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^-|-$/g, "") || "momentum-project";

  doc.save(`${filename}.pdf`);
}
