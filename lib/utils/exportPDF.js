"use client";

/**
 * lib/utils/exportPDF.js — Professional project PDF export
 * - Grid-based spacing for consistency
 * - Optimized phase layout with page breaks
 * - Clean, readable typography
 */
export async function exportProjectPDF(project) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const ML = 16;
  const MR = 16;
  const CW = PW - ML - MR;
  let y = ML;

  // Spacing units (4mm base)
  const sp = {
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    xxl: 16,
  };

  // ── Color Palette ──────────────────────────────────────────────────
  const C = {
    violet: [99, 91, 208],
    violetDim: [67, 58, 168],
    violetLight: [245, 244, 251],
    emerald: [21, 145, 107],
    emeraldLight: [216, 242, 233],
    amber: [180, 110, 18],
    amberLight: [251, 244, 232],
    coral: [205, 82, 44],
    coralLight: [252, 237, 230],
    ink: [20, 20, 32],
    inkMid: [60, 60, 80],
    inkSoft: [100, 100, 120],
    muted: [130, 130, 150],
    border: [225, 225, 240],
    borderDark: [200, 200, 220],
    pageBg: [252, 252, 254],
    white: [255, 255, 255],
  };

  // ── Helper Functions ───────────────────────────────────────────────
  function setColor(type, rgb) {
    if (type === "fill") doc.setFillColor(...rgb);
    else if (type === "draw") doc.setDrawColor(...rgb);
    else doc.setTextColor(...rgb);
  }

  function needsPage(need = sp.xl) {
    if (y + need > PH - ML) {
      doc.addPage();
      y = ML;
      drawPageBg();
    }
  }

  function drawPageBg() {
    setColor("fill", C.pageBg);
    doc.rect(0, 0, PW, PH, "F");
    setColor("fill", C.violet);
    doc.rect(0, 0, 2.5, PH, "F");
  }

  function textBlock(str, x, size, opts = {}) {
    const {
      color = C.ink,
      style = "normal",
      maxW = CW - (x - ML),
      lineH = size * 0.35,
      align = "left",
    } = opts;
    if (!str) return 0;
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
    setColor("text", color);
    const lines = doc.splitTextToSize(String(str), maxW);
    needsPage(lines.length * lineH + sp.sm);
    doc.text(lines, x, y, { align });
    y += lines.length * lineH;
    return lines.length;
  }

  function gap(mm = sp.sm) {
    y += mm;
  }

  function rule(xOffset = 0, w = CW, color = C.border, thickness = 0.25) {
    setColor("draw", color);
    doc.setLineWidth(thickness);
    doc.line(ML + xOffset, y, ML + xOffset + w, y);
    gap(sp.sm + 1);
  }

  function pill(text, x, yw, fillRgb, textRgb) {
    const w = text.length * 1.6 + 5;
    setColor("fill", fillRgb);
    doc.roundedRect(x, yw - 3, w, 5, 0.8, 0.8, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    setColor("text", textRgb);
    doc.text(text, x + w / 2, yw - 0.1, { align: "center" });
    return w + sp.sm;
  }

  function sectionHead(title) {
    needsPage(sp.lg + 4);
    gap(sp.md);
    setColor("fill", C.violetLight);
    doc.roundedRect(ML, y - 3.5, CW, 8, 1, 1, "F");
    setColor("fill", C.violet);
    doc.rect(ML, y - 3.5, 2.5, 8, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    setColor("text", C.violetDim);
    doc.text(title.toUpperCase(), ML + 4.5, y + 1.2);
    y += 8;
    gap(sp.xs);
  }

  function statBox(x, yw, w, h, label, value, valueColor = C.violet) {
    setColor("fill", C.white);
    setColor("draw", C.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, yw, w, h, 1.5, 1.5, "FD");
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    setColor("text", valueColor);
    doc.text(String(value), x + w / 2, yw + 7.5, { align: "center" });
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    setColor("text", C.muted);
    doc.text(label, x + w / 2, yw + 12, { align: "center" });
  }

  function taskRow(task, indent = 0) {
    needsPage(sp.lg + 2);
    const done = task.status === "done";
    const cx = ML + indent;
    const cs = 3.5;
    setColor("draw", done ? C.emerald : C.border);
    setColor("fill", done ? C.emeraldLight : C.white);
    doc.setLineWidth(0.25);
    doc.roundedRect(cx, y - cs + 0.3, cs, cs, 0.6, 0.6, "FD");
    if (done) {
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      setColor("text", C.emerald);
      doc.text("✓", cx + 1, y - 0.2);
    }
    const textX = cx + cs + sp.sm;
    const maxW = CW - indent - cs - sp.md;
    const lines = doc.splitTextToSize(task.title || "", maxW);
    doc.setFontSize(8);
    doc.setFont("helvetica", done ? "italic" : "normal");
    setColor("text", done ? C.muted : C.inkMid);
    doc.text(lines, textX, y);
    y += lines.length * 4.2;
    gap(sp.xs);
  }

  // ── Page 1: Cover & Summary ────────────────────────────────────────
  drawPageBg();

  // Cover header
  const HEADER_H = 48;
  setColor("fill", C.violet);
  doc.rect(0, 0, PW, HEADER_H, "F");

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  setColor("text", C.white);
  doc.setGState && doc.setGState(doc.GState({ opacity: 0.75 }));
  doc.text("MOMENTUM - PROJECT BLUEPRINT", ML + 2.5, 9);
  doc.setGState && doc.setGState(doc.GState({ opacity: 1 }));

  const titleLines = doc.splitTextToSize(
    project.projectTitle || "Untitled Project",
    CW
  );
  doc.setFontSize(titleLines.length > 1 ? 15 : 18);
  doc.setFont("helvetica", "bold");
  setColor("text", C.white);
  doc.text(titleLines, ML + 2.5, 22);

  const scopeLabel =
    (project.scopeLevel || "standard").charAt(0).toUpperCase() +
    (project.scopeLevel || "standard").slice(1);
  const dateLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  setColor("text", C.white);
  doc.setGState && doc.setGState(doc.GState({ opacity: 0.8 }));
  doc.text(
    `${scopeLabel} scope - ${dateLabel} - ${
      project.phases?.length || 0
    } phases - ${project.tasks?.length || 0} tasks`,
    ML + 2.5,
    38
  );
  doc.setGState && doc.setGState(doc.GState({ opacity: 1 }));

  y = HEADER_H + sp.md;

  // One-line goal
  if (project.oneLineGoal) {
    textBlock(project.oneLineGoal, ML, 9.5, {
      color: C.inkMid,
      style: "italic",
    });
    gap(sp.md);
    rule();
  }

  // Summary stats
  const doneTasks =
    project.tasks?.filter((t) => t.status === "done").length ?? 0;
  const totalTasks = project.tasks?.length ?? 0;
  const progress =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const activeBlockers =
    project.blockers?.filter((b) => b.status === "active").length ?? 0;

  needsPage(sp.xl + 2);
  const statW = (CW - 9) / 4;
  const statY = y;
  const statH = 16;
  statBox(ML, statY, statW, statH, "Progress", `${progress}%`, C.violet);
  statBox(
    ML + statW + 3,
    statY,
    statW,
    statH,
    "Tasks Done",
    `${doneTasks}/${totalTasks}`,
    C.emerald
  );
  statBox(
    ML + (statW + 3) * 2,
    statY,
    statW,
    statH,
    "Active Blockers",
    activeBlockers,
    activeBlockers > 0 ? C.coral : C.emerald
  );
  statBox(
    ML + (statW + 3) * 3,
    statY,
    statW,
    statH,
    "Streak (days)",
    project.streakDays || 0,
    C.amber
  );
  y += statH + sp.lg;

  // Metadata
  const meta = [
    project.estimatedEffort && `Effort: ${project.estimatedEffort}`,
    project.timeline && `Timeline: ${project.timeline}`,
    project.targetUser && `For: ${project.targetUser}`,
  ]
    .filter(Boolean)
    .join(" - ");
  if (meta) {
    textBlock(meta, ML, 7.5, { color: C.muted });
    gap(sp.sm);
  }

  gap(sp.sm);

  // Problem statement
  if (project.problemStatement) {
    sectionHead("Problem Statement");
    textBlock(project.problemStatement, ML, 8.5, { color: C.inkMid });
    gap(sp.lg);
  }

  // Success criteria
  if (project.successCriteria?.length) {
    sectionHead("Success Criteria");
    project.successCriteria.forEach((c) => {
      needsPage(sp.lg);
      setColor("text", C.emerald);
      doc.setFontSize(8);
      doc.text("✓", ML + 1.2, y);
      textBlock(c, ML + 4.5, 8, { color: C.inkMid, maxW: CW - 4.5 });
      gap(sp.xs);
    });
    gap(sp.sm);
  }

  // Scope
  const {
    mustHave = [],
    niceToHave = [],
    outOfScope = [],
  } = project.scope ?? {};
  if (mustHave.length || niceToHave.length || outOfScope.length) {
    sectionHead("Scope");
    if (mustHave.length) {
      textBlock("Must have", ML, 8, { color: C.ink, style: "bold" });
      gap(sp.xs);
      mustHave.forEach((s) => {
        textBlock(`• ${s}`, ML + 3, 8, { color: C.inkMid });
        gap(sp.xs);
      });
      gap(sp.sm);
    }
    if (niceToHave.length) {
      textBlock("Nice to have", ML, 8, { color: C.muted, style: "bold" });
      gap(sp.xs);
      niceToHave.forEach((s) => {
        textBlock(`• ${s}`, ML + 3, 8, { color: C.muted });
        gap(sp.xs);
      });
      gap(sp.sm);
    }
    if (outOfScope.length) {
      textBlock("Out of scope", ML, 8, { color: C.coral, style: "bold" });
      gap(sp.xs);
      outOfScope.forEach((s) => {
        textBlock(`• ${s}`, ML + 3, 8, { color: C.coral });
        gap(sp.xs);
      });
    }
    gap(sp.lg);
  }

  // ── Page break before phases ───────────────────────────────────────
  if (project.phases?.length) {
    doc.addPage();
    y = ML;
    drawPageBg();
  }

  // ── Phases (dedicated pages) ───────────────────────────────────────
  if (project.phases?.length) {
    sectionHead("Project Phases");

    project.phases.forEach((phase, pi) => {
      needsPage(sp.xxl + 6);

      // Phase header with number circle
      const phY = y;
      setColor("fill", C.violet);
      doc.circle(ML + 3.5, phY, 3.8, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      setColor("text", C.white);
      doc.text(String(pi + 1), ML + 3.5, phY + 0.7, { align: "center" });

      // Phase name
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      setColor("text", C.ink);
      const phNameLines = doc.splitTextToSize(
        phase.name || `Phase ${pi + 1}`,
        CW - 14
      );
      doc.text(phNameLines, ML + 9.5, phY);
      y += phNameLines.length * 5 + sp.sm;

      // Status pill below title (no overlap)
      const statusColors = {
        active: [C.violetLight, C.violetDim],
        done: [C.emeraldLight, C.emerald],
        upcoming: [[240, 244, 250], C.muted],
      };
      const [sFill, sText] =
        statusColors[phase.status] ?? statusColors.upcoming;
      pill(phase.status.toUpperCase(), ML + 9.5, y, sFill, sText);
      gap(sp.lg);

      // Phase objective
      if (phase.objective) {
        textBlock(phase.objective, ML + 9.5, 8, {
          color: C.inkMid,
          style: "italic",
          maxW: CW - 9.5,
        });
        gap(sp.md);
      }

      // Milestones
      if (phase.milestones?.length) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        setColor("text", C.violet);
        doc.text("Milestones", ML + 9.5, y);
        gap(sp.md);

        phase.milestones.forEach((m) => {
          needsPage(sp.lg + 2);
          doc.setFontSize(8.5);
          doc.setFont("helvetica", "bold");
          setColor("text", C.inkMid);
          const mLines = doc.splitTextToSize(`• ${m.name}`, CW - 12);
          doc.text(mLines, ML + 9.5, y);
          y += mLines.length * 4;

          if (m.doneWhen) {
            textBlock(`Done when: ${m.doneWhen}`, ML + 12, 7, {
              color: C.muted,
              maxW: CW - 12,
            });
            gap(sp.xs);
          }
          if (m.deadline) {
            textBlock(`Deadline: ${m.deadline}`, ML + 12, 7, {
              color: C.amber,
              maxW: CW - 12,
            });
            gap(sp.xs);
          }
          if (m.risk) {
            textBlock(`Risk: ${m.risk}`, ML + 12, 7, {
              color: C.coral,
              maxW: CW - 12,
            });
            gap(sp.xs);
          }
          gap(sp.md);
        });
      }

      // Tasks for phase
      const phaseTasks =
        project.tasks?.filter((t) => t.phaseId === phase.id) ?? [];
      if (phaseTasks.length) {
        gap(sp.sm);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        setColor("text", C.violet);
        doc.text("Tasks", ML + 9.5, y);
        gap(sp.md);
        phaseTasks.forEach((task) => taskRow(task, 9.5));
      }

      gap(sp.md);
      rule(0, CW, C.borderDark, 0.2);
      gap(sp.sm);

      // New page for next phase if not last
      if (pi < project.phases.length - 1) {
        doc.addPage();
        y = ML;
        drawPageBg();
      }
    });
  }

  // ── Today's next action ────────────────────────────────────────────
  if (project.dailyNextAction) {
    sectionHead("Today's Next Action");
    needsPage(sp.xl + 4);
    const naLines = doc.splitTextToSize(project.dailyNextAction, CW - 10);
    const boxH = naLines.length * 5 + 10;
    setColor("fill", C.emeraldLight);
    setColor("draw", C.emerald);
    doc.setLineWidth(0.4);
    doc.roundedRect(ML, y, CW, boxH, 2, 2, "FD");
    setColor("fill", C.emerald);
    doc.rect(ML, y, 2.5, boxH, "F");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    setColor("text", C.emerald);
    doc.text(naLines, ML + 7, y + 6);
    y += boxH + sp.lg;
  }

  // ── Active blockers ────────────────────────────────────────────────
  const blockers = project.blockers?.filter((b) => b.status === "active") ?? [];
  if (blockers.length) {
    sectionHead("Active Blockers");
    blockers.forEach((b) => {
      needsPage(sp.lg + 2);
      doc.setFontSize(9);
      setColor("text", C.coral);
      doc.text("!", ML + 1.2, y);
      textBlock(b.description, ML + 5, 8, { color: C.inkMid, maxW: CW - 5 });
      gap(sp.md);
    });
  }

  // ── Suggested tools ────────────────────────────────────────────────
  if (project.toolsSuggested?.length) {
    sectionHead("Suggested Tools");
    const toolText = project.toolsSuggested.join(" - ");
    textBlock(toolText, ML, 8, { color: C.inkMid });
    gap(sp.lg);
  }

  // ── Retrospective ──────────────────────────────────────────────────
  if (project.postmortem?.answers?.length) {
    sectionHead("Retrospective");
    project.postmortem.answers.forEach((a) => {
      needsPage(sp.lg + 4);
      textBlock(a.question, ML, 8.5, { color: C.ink, style: "bold" });
      gap(sp.xs);
      textBlock(a.answer || "—", ML + 3, 8, { color: C.inkMid });
      gap(sp.md);
      rule(3, CW - 3, C.border, 0.2);
    });
  }

  // ── Footer on every page ───────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    setColor("fill", [248, 248, 250]);
    doc.rect(0, PH - 10, PW, 10, "F");
    setColor("draw", C.border);
    doc.setLineWidth(0.25);
    doc.line(0, PH - 10, PW, PH - 10);

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    setColor("text", C.muted);
    doc.text("Momentum", ML + 2.5, PH - 4);
    doc.text(
      (project.projectTitle || "").slice(0, 40) || "Project Blueprint",
      PW / 2,
      PH - 4,
      { align: "center" }
    );
    doc.text(`${p} / ${totalPages}`, PW - MR - 2.5, PH - 4, { align: "right" });
  }

  // ── Save ───────────────────────────────────────────────────────────
  const filename =
    (project.projectTitle || "project")
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^-|-$/g, "") || "momentum-project";

  doc.save(`${filename}.pdf`);
}
