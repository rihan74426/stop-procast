"use client";

/**
 * Client-side PDF export using jsPDF (loaded dynamically).
 * Improved layout, consistent spacing, left-bar section headers,
 * checkbox rendering for tasks, and boxed "Today's Action".
 */
export async function exportProjectPDF(project) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Styling / layout config
  const STYLE = {
    lineHeight: 6.2, // mm per text line
    sectionGap: 6,
    smallGap: 3,
    headerHeight: 32,
    colors: {
      primary: [127, 119, 221],
      accent: [83, 74, 183],
      muted: [120, 120, 150],
      positive: [29, 158, 117],
      danger: [216, 90, 48],
      text: [25, 25, 45],
      subtleText: [75, 75, 100],
      boxBg: [225, 245, 238],
      headerBg: [127, 119, 221],
      headerLabel: [255, 255, 255],
      sectionFill: [238, 237, 254],
    },
    fonts: {
      base: "helvetica",
      sizes: {
        title: 16,
        subtitle: 9.5,
        normal: 9,
        small: 7.5,
        xsmall: 7,
      },
    },
    checkboxSize: 4.5,
  };

  function checkPage(need = STYLE.lineHeight * 2) {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }

  // flexible text drawing with indent, box, and bullet support
  function text(str, x = margin, size = STYLE.fonts.sizes.normal, opts = {}) {
    const {
      style = "normal",
      color = STYLE.colors.text,
      indent = 0,
      bullet = null, // string like '•' or '✓' or null
      box = false,
      boxPadding = 3,
      maxWidth = contentW - (x - margin) - indent,
    } = opts;

    doc.setFontSize(size);
    doc.setFont(STYLE.fonts.base, style);
    doc.setTextColor(...color);

    const indentX = x + indent;
    const available = maxWidth;
    const lines = doc.splitTextToSize(String(str || ""), available);

    const blockHeight =
      lines.length * STYLE.lineHeight + (box ? boxPadding * 2 : 0);
    checkPage(blockHeight + 1);

    if (box) {
      const bx = x;
      const by = y - boxPadding / 2;
      doc.setFillColor(...STYLE.colors.boxBg);
      doc.roundedRect(
        bx,
        by,
        available + boxPadding * 2,
        blockHeight,
        2,
        2,
        "F"
      );
    }

    if (bullet) {
      doc.text(bullet, x + 1, y);
      doc.setTextColor(...color);
      doc.text(lines, indentX + 2, y);
    } else {
      doc.text(lines, indentX, y);
    }

    y += lines.length * STYLE.lineHeight;
  }

  // cleaner section header with left color bar + pill
  function sectionHeader(title) {
    y += STYLE.smallGap;
    checkPage(STYLE.sectionGap + STYLE.lineHeight);
    const barW = 3;
    const barH = 8;
    doc.setFillColor(...STYLE.colors.sectionFill);
    doc.roundedRect(margin, y - 3.5, contentW, 7, 1.5, 1.5, "F");

    // left colored bar
    doc.setFillColor(...STYLE.colors.primary);
    doc.rect(margin + 2, y - 2.5, barW, barH, "F");

    // title pill
    doc.setFontSize(STYLE.fonts.sizes.small);
    doc.setFont(STYLE.fonts.base, "bold");
    doc.setTextColor(...STYLE.colors.accent);
    doc.text(title.toUpperCase(), margin + barW + 6, y + 0.5);
    y += 6;
  }

  // helper to draw a subtle divider
  function divider(extra = 0) {
    doc.setDrawColor(220, 220, 235);
    doc.line(margin + 2, y + extra, pageW - margin - 2, y + extra);
    y += STYLE.smallGap;
  }

  // compact footer to appear on every page
  function drawFooters() {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(STYLE.fonts.sizes.xsmall);
      doc.setFont(STYLE.fonts.base, "normal");
      doc.setTextColor(170, 170, 190);
      const leftText = `Momentum`;
      const centerText = `${new Date().toLocaleDateString()}`;
      const rightText = `${i} / ${totalPages}`;

      doc.text(leftText, margin, pageH - 7);
      const centerX = pageW / 2;
      doc.text(centerText, centerX, pageH - 7, { align: "center" });
      doc.text(rightText, pageW - margin - 4, pageH - 7);
    }
  }

  // ── Header ──────────────────────────────────────────────────────
  doc.setFillColor(...STYLE.colors.headerBg);
  doc.rect(0, 0, pageW, STYLE.headerHeight, "F");

  // App label
  doc.setFontSize(STYLE.fonts.sizes.xsmall);
  doc.setFont(STYLE.fonts.base, "normal");
  doc.setTextColor(...STYLE.colors.headerLabel);
  if (doc.setGlobalAlpha) doc.setGlobalAlpha(0.85);
  doc.text("MOMENTUM", margin, 9);
  if (doc.setGlobalAlpha) doc.setGlobalAlpha(1);

  // Title
  doc.setFontSize(STYLE.fonts.sizes.title);
  doc.setFont(STYLE.fonts.base, "bold");
  doc.setTextColor(...STYLE.colors.headerLabel);
  const titleLines = doc.splitTextToSize(
    project.projectTitle || "Untitled",
    contentW
  );
  doc.text(titleLines, margin, 19);
  y = STYLE.headerHeight + 7;

  // One-line goal
  text(project.oneLineGoal, margin, STYLE.fonts.sizes.subtitle, {
    style: "italic",
    color: [80, 80, 110],
  });
  y += 2;

  // Meta (compact)
  const meta = [
    project.scopeLevel && `Scope: ${project.scopeLevel}`,
    project.estimatedEffort && `Effort: ${project.estimatedEffort}`,
    project.timeline && `Timeline: ${project.timeline}`,
    `${project.tasks?.length || 0} tasks`,
    `${project.phases?.length || 0} phases`,
  ]
    .filter(Boolean)
    .join("  ·  ");

  doc.setFontSize(STYLE.fonts.sizes.small);
  doc.setFont(STYLE.fonts.base, "normal");
  doc.setTextColor(...STYLE.colors.muted);
  const metaLines = doc.splitTextToSize(meta, contentW);
  doc.text(metaLines, margin, y);
  y += metaLines.length * (STYLE.lineHeight * 0.75) + 4;

  divider(0);

  // ── Problem ────────────────────────────────────────────────────
  if (project.problemStatement) {
    sectionHeader("Problem Statement");
    text(project.problemStatement, margin, STYLE.fonts.sizes.normal, {
      style: "normal",
      color: [60, 60, 80],
    });
    y += 2;
  }
  if (project.targetUser) {
    text(
      `Target user: ${project.targetUser}`,
      margin,
      STYLE.fonts.sizes.small,
      {
        style: "italic",
        color: [100, 100, 130],
      }
    );
    y += 2;
  }

  // ── Success Criteria ───────────────────────────────────────────
  if (project.successCriteria?.length) {
    sectionHeader("Success Criteria");
    project.successCriteria.forEach((c) => {
      checkPage(STYLE.lineHeight);
      doc.setFontSize(8.5);
      doc.setFont(STYLE.fonts.base, "normal");
      doc.setTextColor(...STYLE.colors.positive);
      // bullet + text with slight indent
      text(c, margin, 8.5, {
        indent: 7,
        bullet: "✓",
        color: STYLE.colors.text,
      });
      y += 1;
    });
    y += 2;
  }

  // ── Scope ──────────────────────────────────────────────────────
  if (
    project.scope?.mustHave?.length ||
    project.scope?.niceToHave?.length ||
    project.scope?.outOfScope?.length
  ) {
    sectionHeader("Scope");
    if (project.scope.mustHave?.length) {
      text("Must have:", margin, STYLE.fonts.sizes.small, {
        style: "bold",
        color: [50, 50, 70],
      });
      project.scope.mustHave.forEach((s) =>
        text(`  ${s}`, margin, STYLE.fonts.sizes.normal, {
          indent: 4,
          color: [60, 60, 80],
        })
      );
    }
    if (project.scope.niceToHave?.length) {
      text("Nice to have:", margin, STYLE.fonts.sizes.small, {
        style: "bold",
        color: [100, 100, 130],
      });
      project.scope.niceToHave.forEach((s) =>
        text(`  ${s}`, margin, STYLE.fonts.sizes.normal, {
          indent: 4,
          color: [100, 100, 130],
        })
      );
    }
    if (project.scope.outOfScope?.length) {
      text("Out of scope:", margin, STYLE.fonts.sizes.small, {
        style: "bold",
        color: [180, 100, 100],
      });
      project.scope.outOfScope.forEach((s) =>
        text(`  ${s}`, margin, STYLE.fonts.sizes.normal, {
          indent: 4,
          color: [160, 100, 100],
        })
      );
    }
  }

  // ── Phases ─────────────────────────────────────────────────────
  if (project.phases?.length) {
    sectionHeader("Project Phases");
    project.phases.forEach((phase, pi) => {
      checkPage(18);
      y += 2;

      // Phase marker (circle) + title
      doc.setFillColor(...STYLE.colors.primary);
      doc.circle(margin + 3.5, y - 1, 3.5, "F");
      doc.setFontSize(7.5);
      doc.setFont(STYLE.fonts.base, "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(String(pi + 1), margin + 2.2, y);

      doc.setFontSize(10.5);
      doc.setFont(STYLE.fonts.base, "bold");
      doc.setTextColor(...STYLE.colors.text);
      doc.text(phase.name || `Phase ${pi + 1}`, margin + 9, y);
      y += STYLE.lineHeight;

      if (phase.objective) {
        text(phase.objective, margin + 9, STYLE.fonts.sizes.normal, {
          style: "italic",
          color: [80, 80, 110],
          indent: 0,
        });
      }

      // Tasks (render checkbox + wrapped text)
      const phaseTasks =
        project.tasks?.filter((t) => t.phaseId === phase.id) || [];
      if (phaseTasks.length) {
        y += 1;
        phaseTasks.forEach((task) => {
          checkPage(STYLE.lineHeight);
          const done = task.status === "done";
          const checkboxX = margin + 9;
          const textX = checkboxX + STYLE.checkboxSize + 3;
          // draw checkbox
          doc.setDrawColor(180, 180, 200);
          doc.setFillColor(...(done ? [200, 230, 210] : [255, 255, 255]));
          doc.rect(
            checkboxX,
            y - STYLE.checkboxSize + 1,
            STYLE.checkboxSize,
            STYLE.checkboxSize,
            "FD"
          );
          if (done) {
            doc.setFontSize(7);
            doc.setTextColor(45, 120, 75);
            doc.text("✓", checkboxX + 1.1, y);
          }

          // task text
          doc.setFontSize(8);
          doc.setFont(STYLE.fonts.base, done ? "italic" : "normal");
          doc.setTextColor(...(done ? [150, 150, 170] : STYLE.colors.text));
          const tLines = doc.splitTextToSize(
            task.title,
            contentW - (textX - margin)
          );
          checkPage(tLines.length * STYLE.lineHeight);
          doc.text(tLines, textX, y);
          y += tLines.length * STYLE.lineHeight;
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
      checkPage(STYLE.lineHeight);
      doc.setFontSize(9);
      doc.setTextColor(...STYLE.colors.danger);
      doc.text("⊘", margin, y);
      doc.setFont(STYLE.fonts.base, "normal");
      doc.setTextColor(...STYLE.colors.subtleText);
      const bl = doc.splitTextToSize(b.description, contentW - 7);
      doc.text(bl, margin + 6, y);
      y += bl.length * STYLE.lineHeight;
    });
  }

  // ── Tools ──────────────────────────────────────────────────────
  if (project.toolsSuggested?.length) {
    sectionHeader("Suggested Tools");
    text(
      project.toolsSuggested.join("  ·  "),
      margin,
      STYLE.fonts.sizes.normal,
      {
        color: [60, 60, 80],
      }
    );
  }

  // ── Next Action ────────────────────────────────────────────────
  if (project.dailyNextAction) {
    sectionHeader("Today's Action");
    const naLines = doc.splitTextToSize(project.dailyNextAction, contentW - 8);
    const boxH = naLines.length * STYLE.lineHeight + 8;
    checkPage(boxH + 6);
    // stronger boxed style for call-to-action
    doc.setFillColor(...STYLE.colors.boxBg);
    doc.roundedRect(margin, y - 4, contentW, boxH, 2, 2, "F");
    doc.setFontSize(9.5);
    doc.setFont(STYLE.fonts.base, "bold");
    doc.setTextColor(15, 110, 86);
    doc.text(naLines, margin + 6, y + 1.5);
    y += boxH + 2;
  }

  // ── Retrospective ──────────────────────────────────────────────
  if (project.postmortem?.answers?.length) {
    sectionHeader("Retrospective");
    project.postmortem.answers.forEach((a) => {
      checkPage(STYLE.lineHeight * 4);
      text(a.question, margin, STYLE.fonts.sizes.normal, {
        style: "bold",
        color: STYLE.colors.text,
      });
      text(a.answer || "—", margin + 3, STYLE.fonts.sizes.small, {
        color: STYLE.colors.subtleText,
      });
      y += 2;
    });
  }

  // ── Footer on each page ────────────────────────────────────────
  drawFooters();

  // filename safe
  const filename =
    (project.projectTitle || "project")
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^-|-$/g, "") || "momentum-project";

  doc.save(`${filename}.pdf`);
}
