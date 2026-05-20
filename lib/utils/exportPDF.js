"use client";

/**
 * lib/utils/exportPDF.js
 * Multilingual PDF exporter for jsPDF
 *
 * Put these font files in /public/fonts:
 * - NotoSans-Regular.ttf
 * - NotoSans-Bold.ttf
 * - NotoSansBengali-Regular.ttf
 * - NotoSansBengali-Bold.ttf
 * - NotoNaskhArabic-Regular.ttf
 * - NotoNaskhArabic-Bold.ttf
 * - NotoSansSC-Regular.ttf
 * - NotoSansSC-Bold.ttf
 *
 * Notes:
 * - Latin / French / Spanish / German use Noto Sans
 * - Bengali uses Noto Sans Bengali
 * - Arabic uses Noto Naskh Arabic
 * - Chinese uses Noto Sans SC
 */

async function fetchFontAsBase64(url) {
  // Try to use Blob -> FileReader.readAsDataURL (robust in browsers).
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load font: ${url}`);
    const blob = await res.blob();

    if (typeof FileReader !== "undefined") {
      const dataUrl = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onerror = () => reject(new Error("Failed to read font blob"));
        fr.onload = () => resolve(fr.result);
        fr.readAsDataURL(blob);
      });
      // dataUrl is like "data:font/ttf;base64,AAAA..."
      const comma = dataUrl.indexOf(",");
      return dataUrl.slice(comma + 1);
    }

    // Fallback: arrayBuffer -> base64 using chunking (keeps previous behavior)
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  } catch (err) {
    // Re-throw so caller can handle missing fonts gracefully
    throw err;
  }
}

function cleanFileName(input) {
  // Keep Unicode characters but remove illegal filesystem characters.
  // Normalize to NFC for consistent combining mark behavior.
  const raw = String(input || "momentum-project")
    .normalize("NFC")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "") // remove illegal FS chars and controls
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();

  return raw || "momentum-project";
}

function isArabicText(text = "") {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

function isBengaliText(text = "") {
  return /[\u0980-\u09FF]/.test(text);
}

function isChineseText(text = "") {
  return /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(text);
}

function normalizeDisplayText(input) {
  if (input == null) return "";
  // Use NFC to keep combining marks in a stable representation for rendering.
  let s = String(input).normalize("NFC");

  // Replace non-breaking space with normal space
  s = s.replace(/\u00A0/g, " ");

  // Normalize line endings
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Remove C0 control characters except newline and tab
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // Replace lone surrogates (invalid UTF-16 halves) with the replacement character
  s = s.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    "\uFFFD"
  );

  return s;
}

export async function exportProjectPDF(project) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const ML = 16;
  const MR = 16;
  const MT = 16;
  const MB = 14;
  const CW = PW - ML - MR;

  let y = MT;

  const sp = {
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    xxl: 16,
  };

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
    muted: [130, 130, 150],
    border: [225, 225, 240],
    borderDark: [200, 200, 220],
    pageBg: [252, 252, 254],
    white: [255, 255, 255],
  };

  async function registerFonts() {
    const fontSpecs = [
      {
        file: "NotoSans-Regular.ttf",
        url: "/fonts/NotoSans-Regular.ttf",
        family: "NotoSans",
        style: "normal",
      },
      {
        file: "NotoSans-Bold.ttf",
        url: "/fonts/NotoSans-Bold.ttf",
        family: "NotoSans",
        style: "bold",
      },

      {
        file: "NotoSansBengali-Regular.ttf",
        url: "/fonts/NotoSansBengali-Regular.ttf",
        family: "NotoSansBengali",
        style: "normal",
      },
      {
        file: "NotoSansBengali-Bold.ttf",
        url: "/fonts/NotoSansBengali-Bold.ttf",
        family: "NotoSansBengali",
        style: "bold",
      },

      {
        file: "NotoNaskhArabic-Regular.ttf",
        url: "/fonts/NotoNaskhArabic-Regular.ttf",
        family: "NotoNaskhArabic",
        style: "normal",
      },
      {
        file: "NotoNaskhArabic-Bold.ttf",
        url: "/fonts/NotoNaskhArabic-Bold.ttf",
        family: "NotoNaskhArabic",
        style: "bold",
      },

      {
        file: "NotoSansSC-Regular.ttf",
        url: "/fonts/NotoSansSC-Regular.ttf",
        family: "NotoSansSC",
        style: "normal",
      },
      {
        file: "NotoSansSC-Bold.ttf",
        url: "/fonts/NotoSansSC-Bold.ttf",
        family: "NotoSansSC",
        style: "bold",
      },
    ];

    const results = await Promise.allSettled(
      fontSpecs.map(async (spec) => {
        const data = await fetchFontAsBase64(spec.url);
        return { ...spec, data };
      })
    );

    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      const f = r.value;
      doc.addFileToVFS(f.file, f.data);
      doc.addFont(f.file, f.family, f.style);
    }
  }

  function setColor(type, rgb) {
    if (type === "fill") doc.setFillColor(...rgb);
    else if (type === "draw") doc.setDrawColor(...rgb);
    else doc.setTextColor(...rgb);
  }

  function drawPageBg() {
    setColor("fill", C.pageBg);
    doc.rect(0, 0, PW, PH, "F");
    setColor("fill", C.violet);
    doc.rect(0, 0, 2.5, PH, "F");
  }

  function needsPage(need = sp.xl) {
    if (y + need > PH - MB) {
      doc.addPage();
      y = MT;
      drawPageBg();
    }
  }

  function gap(mm = sp.sm) {
    y += mm;
  }

  function chooseFont(text, style = "normal") {
    if (isArabicText(text)) return "NotoNaskhArabic";
    if (isBengaliText(text)) return "NotoSansBengali";
    if (isChineseText(text)) return "NotoSansSC";
    return "NotoSans";
  }

  function chooseStyleForFont(fontFamily, requestedStyle = "normal") {
    if (requestedStyle === "bold") return "bold";
    if (requestedStyle === "italic")
      return fontFamily === "NotoSans" ? "italic" : "normal";
    return "normal";
  }

  function processText(text) {
    const clean = normalizeDisplayText(text);
    if (isArabicText(clean) && typeof doc.processArabic === "function") {
      // doc.processArabic is expected to return a shaped string; pass normalized input.
      return doc.processArabic(clean);
    }
    return clean;
  }

  function textHeight(linesCount, size) {
    return linesCount * size * 0.42;
  }

  function drawText(str, x, size, opts = {}) {
    const {
      color = C.ink,
      style = "normal",
      maxW = CW - (x - ML),
      align = "left",
      rtl = false,
    } = opts;

    const clean = normalizeDisplayText(str);
    if (!clean.trim()) return 0;

    const fontFamily = chooseFont(clean, style);
    const actualStyle = chooseStyleForFont(fontFamily, style);
    const isRtl = rtl || isArabicText(clean);

    doc.setFont(fontFamily, actualStyle);
    doc.setFontSize(size);
    setColor("text", color);

    const rendered = processText(clean);
    const lines = doc.splitTextToSize(rendered, maxW);

    const h = textHeight(lines.length, size);
    needsPage(h + sp.xs);

    if (isRtl) {
      doc.setR2L(true);
    }

    const drawX = isRtl && align === "left" ? x + maxW : x;
    const drawAlign = isRtl && align === "left" ? "right" : align;

    doc.text(lines, drawX, y, { align: drawAlign });

    if (isRtl) {
      doc.setR2L(false);
    }

    y += h;
    return lines.length;
  }

  function sectionHead(title) {
    needsPage(sp.lg + 4);
    gap(sp.md);

    setColor("fill", C.violetLight);
    doc.roundedRect(ML, y - 3.5, CW, 8, 1, 1, "F");
    setColor("fill", C.violet);
    doc.rect(ML, y - 3.5, 2.5, 8, "F");

    doc.setFont("NotoSans", "bold");
    doc.setFontSize(7.5);
    setColor("text", C.violetDim);
    doc.text(String(title).toUpperCase(), ML + 4.5, y + 1.2);

    y += 8;
    gap(sp.xs);
  }

  function rule(xOffset = 0, w = CW, color = C.border, thickness = 0.25) {
    setColor("draw", color);
    doc.setLineWidth(thickness);
    doc.line(ML + xOffset, y, ML + xOffset + w, y);
    gap(sp.sm + 1);
  }

  function pill(text, x, yw, fillRgb, textRgb) {
    const clean = normalizeDisplayText(text);
    const w = Math.max(18, clean.length * 1.6 + 5);

    setColor("fill", fillRgb);
    doc.roundedRect(x, yw - 3, w, 5, 0.8, 0.8, "F");
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(6.5);
    setColor("text", textRgb);
    doc.text(clean, x + w / 2, yw - 0.1, { align: "center" });
    return w + sp.sm;
  }

  function statBox(x, yw, w, h, label, value, valueColor = C.violet) {
    setColor("fill", C.white);
    setColor("draw", C.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, yw, w, h, 1.5, 1.5, "FD");

    doc.setFont("NotoSans", "bold");
    doc.setFontSize(13);
    setColor("text", valueColor);
    doc.text(normalizeDisplayText(String(value)), x + w / 2, yw + 7.5, {
      align: "center",
    });

    doc.setFont("NotoSans", "normal");
    doc.setFontSize(6);
    setColor("text", C.muted);
    doc.text(normalizeDisplayText(label), x + w / 2, yw + 12, {
      align: "center",
    });
  }

  function taskRow(task, indent = 0) {
    const title = normalizeDisplayText(task?.title || "");
    needsPage(sp.lg + 4);

    const done = task?.status === "done";
    const cx = ML + indent;
    const cs = 3.5;

    setColor("draw", done ? C.emerald : C.border);
    setColor("fill", done ? C.emeraldLight : C.white);
    doc.setLineWidth(0.25);
    doc.roundedRect(cx, y - cs + 0.3, cs, cs, 0.6, 0.6, "FD");

    if (done) {
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(6);
      setColor("text", C.emerald);
      doc.text("✓", cx + 1, y - 0.2);
    }

    const textX = cx + cs + sp.sm;
    const maxW = CW - indent - cs - sp.md;

    doc.setFontSize(8);
    doc.setFont(chooseFont(title), done ? "italic" : "normal");
    setColor("text", done ? C.muted : C.inkMid);

    const rendered = processText(title);
    const lines = doc.splitTextToSize(rendered, maxW);
    doc.text(lines, textX, y);

    y += textHeight(lines.length, 8);
    gap(sp.xs);
  }

  function bulletList(items, indent = 0, color = C.inkMid) {
    (items || []).forEach((item) => {
      const line = normalizeDisplayText(item);
      if (!line.trim()) return;
      needsPage(sp.lg);

      doc.setFont("NotoSans", "normal");
      doc.setFontSize(8);
      setColor("text", color);

      const bulletX = ML + indent;
      doc.text("•", bulletX, y);

      drawText(line, bulletX + 3.8, 8, {
        color,
        maxW: CW - indent - 3.8,
      });

      gap(sp.xs);
    });
  }

  await registerFonts();
  drawPageBg();

  // ── Cover header ──────────────────────────────────────────────────
  const HEADER_H = 48;
  setColor("fill", C.violet);
  doc.rect(0, 0, PW, HEADER_H, "F");

  doc.setFont("NotoSans", "bold");
  doc.setFontSize(6.5);
  setColor("text", C.white);
  doc.text("MOMENTUM - PROJECT BLUEPRINT", ML + 2.5, 9);

  const title = normalizeDisplayText(
    project?.projectTitle || "Untitled Project"
  );
  const titleFamily = chooseFont(title, "bold");
  doc.setFont(titleFamily, "bold");
  doc.setFontSize(title.length > 34 ? 15 : 18);
  setColor("text", C.white);
  const titleLines = doc.splitTextToSize(processText(title), CW);
  doc.text(titleLines, ML + 2.5, 22);

  const scopeLevel = normalizeDisplayText(project?.scopeLevel || "standard");
  const scopeLabel = scopeLevel.charAt(0).toUpperCase() + scopeLevel.slice(1);
  const dateLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(6.5);
  setColor("text", C.white);
  doc.text(
    `${scopeLabel} scope - ${dateLabel} - ${
      project?.phases?.length || 0
    } phases - ${project?.tasks?.length || 0} tasks`,
    ML + 2.5,
    38
  );

  y = HEADER_H + sp.md;

  // ── One-line goal ─────────────────────────────────────────────────
  if (project?.oneLineGoal) {
    drawText(project.oneLineGoal, ML, 9.5, {
      color: C.inkMid,
      style: "italic",
    });
    gap(sp.md);
    rule();
  }

  // ── Summary stats ─────────────────────────────────────────────────
  const doneTasks =
    project?.tasks?.filter((t) => t.status === "done").length ?? 0;
  const totalTasks = project?.tasks?.length ?? 0;
  const progress =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const activeBlockers =
    project?.blockers?.filter((b) => b.status === "active").length ?? 0;

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
    project?.streakDays || 0,
    C.amber
  );
  y += statH + sp.lg;

  // ── Metadata ──────────────────────────────────────────────────────
  const meta = [
    project?.estimatedEffort && `Effort: ${project.estimatedEffort}`,
    project?.timeline && `Timeline: ${project.timeline}`,
    project?.targetUser && `For: ${project.targetUser}`,
  ]
    .filter(Boolean)
    .join(" - ");

  if (meta) {
    drawText(meta, ML, 7.5, { color: C.muted });
    gap(sp.sm);
  }

  gap(sp.sm);

  // ── Problem statement ─────────────────────────────────────────────
  if (project?.problemStatement) {
    sectionHead("Problem Statement");
    drawText(project.problemStatement, ML, 8.5, { color: C.inkMid });
    gap(sp.lg);
  }

  // ── Success criteria ──────────────────────────────────────────────
  if (project?.successCriteria?.length) {
    sectionHead("Success Criteria");
    project.successCriteria.forEach((c) => {
      const line = normalizeDisplayText(c);
      needsPage(sp.lg);

      doc.setFont("NotoSans", "bold");
      doc.setFontSize(8);
      setColor("text", C.emerald);
      doc.text("✓", ML + 1.2, y);

      drawText(line, ML + 4.5, 8, { color: C.inkMid, maxW: CW - 4.5 });
      gap(sp.xs);
    });
    gap(sp.sm);
  }

  // ── Scope ─────────────────────────────────────────────────────────
  const scope = project?.scope ?? {};
  const mustHave = scope.mustHave ?? [];
  const niceToHave = scope.niceToHave ?? [];
  const outOfScope = scope.outOfScope ?? [];

  if (mustHave.length || niceToHave.length || outOfScope.length) {
    sectionHead("Scope");

    if (mustHave.length) {
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(8);
      setColor("text", C.ink);
      doc.text("Must have", ML, y);
      gap(sp.xs);
      bulletList(mustHave, 0, C.inkMid);
      gap(sp.sm);
    }

    if (niceToHave.length) {
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(8);
      setColor("text", C.muted);
      doc.text("Nice to have", ML, y);
      gap(sp.xs);
      bulletList(niceToHave, 0, C.muted);
      gap(sp.sm);
    }

    if (outOfScope.length) {
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(8);
      setColor("text", C.coral);
      doc.text("Out of scope", ML, y);
      gap(sp.xs);
      bulletList(outOfScope, 0, C.coral);
    }

    gap(sp.lg);
  }

  // ── Phases ────────────────────────────────────────────────────────
  if (project?.phases?.length) {
    doc.addPage();
    y = MT;
    drawPageBg();

    sectionHead("Project Phases");

    project.phases.forEach((phase, pi) => {
      needsPage(sp.xxl + 10);

      const phY = y;
      setColor("fill", C.violet);
      doc.circle(ML + 3.5, phY, 3.8, "F");

      doc.setFont("NotoSans", "bold");
      doc.setFontSize(8);
      setColor("text", C.white);
      doc.text(String(pi + 1), ML + 3.5, phY + 0.7, { align: "center" });

      const phaseName = normalizeDisplayText(phase?.name || `Phase ${pi + 1}`);
      const phaseFamily = chooseFont(phaseName, "bold");
      doc.setFont(phaseFamily, "bold");
      doc.setFontSize(10.5);
      setColor("text", C.ink);

      const phNameLines = doc.splitTextToSize(processText(phaseName), CW - 14);
      doc.text(phNameLines, ML + 9.5, phY);
      y += textHeight(phNameLines.length, 10.5) + sp.sm;

      const statusColors = {
        active: [C.violetLight, C.violetDim],
        done: [C.emeraldLight, C.emerald],
        upcoming: [[240, 244, 250], C.muted],
      };
      const [sFill, sText] =
        statusColors[phase?.status] ?? statusColors.upcoming;
      pill(
        String(phase?.status || "upcoming").toUpperCase(),
        ML + 9.5,
        y,
        sFill,
        sText
      );
      gap(sp.lg);

      if (phase?.objective) {
        drawText(phase.objective, ML + 9.5, 8, {
          color: C.inkMid,
          style: "italic",
          maxW: CW - 9.5,
        });
        gap(sp.md);
      }

      if (phase?.milestones?.length) {
        doc.setFont("NotoSans", "bold");
        doc.setFontSize(8);
        setColor("text", C.violet);
        doc.text("Milestones", ML + 9.5, y);
        gap(sp.md);

        phase.milestones.forEach((m) => {
          needsPage(sp.lg + 2);

          const name = normalizeDisplayText(m?.name || "");
          doc.setFont("NotoSans", "bold");
          doc.setFontSize(8.5);
          setColor("text", C.inkMid);
          const mLines = doc.splitTextToSize(processText(`• ${name}`), CW - 12);
          doc.text(mLines, ML + 9.5, y);
          y += textHeight(mLines.length, 8.5);

          if (m?.doneWhen) {
            drawText(`Done when: ${m.doneWhen}`, ML + 12, 7, {
              color: C.muted,
              maxW: CW - 12,
            });
            gap(sp.xs);
          }
          if (m?.deadline) {
            drawText(`Deadline: ${m.deadline}`, ML + 12, 7, {
              color: C.amber,
              maxW: CW - 12,
            });
            gap(sp.xs);
          }
          if (m?.risk) {
            drawText(`Risk: ${m.risk}`, ML + 12, 7, {
              color: C.coral,
              maxW: CW - 12,
            });
            gap(sp.xs);
          }

          gap(sp.md);
        });
      }

      const phaseTasks =
        project?.tasks?.filter((t) => t.phaseId === phase?.id) ?? [];
      if (phaseTasks.length) {
        gap(sp.sm);
        doc.setFont("NotoSans", "bold");
        doc.setFontSize(8);
        setColor("text", C.violet);
        doc.text("Tasks", ML + 9.5, y);
        gap(sp.md);

        phaseTasks.forEach((task) => taskRow(task, 9.5));
      }

      gap(sp.md);
      rule(0, CW, C.borderDark, 0.2);
      gap(sp.sm);

      if (pi < project.phases.length - 1) {
        doc.addPage();
        y = MT;
        drawPageBg();
      }
    });
  }

  // ── Today's next action ───────────────────────────────────────────
  if (project?.dailyNextAction) {
    sectionHead("Today's Next Action");
    needsPage(sp.xl + 4);

    const na = normalizeDisplayText(project.dailyNextAction);
    const naLines = doc.splitTextToSize(processText(na), CW - 10);
    const boxH = textHeight(naLines.length, 8.5) + 10;

    setColor("fill", C.emeraldLight);
    setColor("draw", C.emerald);
    doc.setLineWidth(0.4);
    doc.roundedRect(ML, y, CW, boxH, 2, 2, "FD");

    setColor("fill", C.emerald);
    doc.rect(ML, y, 2.5, boxH, "F");

    doc.setFont("NotoSans", "bold");
    doc.setFontSize(8.5);
    setColor("text", C.emerald);
    doc.text(naLines, ML + 7, y + 6);

    y += boxH + sp.lg;
  }

  // ── Active blockers ───────────────────────────────────────────────
  const blockers =
    project?.blockers?.filter((b) => b.status === "active") ?? [];
  if (blockers.length) {
    sectionHead("Active Blockers");
    blockers.forEach((b) => {
      needsPage(sp.lg + 2);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(9);
      setColor("text", C.coral);
      doc.text("!", ML + 1.2, y);
      drawText(b?.description || "", ML + 5, 8, {
        color: C.inkMid,
        maxW: CW - 5,
      });
      gap(sp.md);
    });
  }

  // ── Suggested tools ───────────────────────────────────────────────
  if (project?.toolsSuggested?.length) {
    sectionHead("Suggested Tools");
    const toolText = project.toolsSuggested.join(" - ");
    drawText(toolText, ML, 8, { color: C.inkMid });
    gap(sp.lg);
  }

  // ── Retrospective ─────────────────────────────────────────────────
  if (project?.postmortem?.answers?.length) {
    sectionHead("Retrospective");
    project.postmortem.answers.forEach((a) => {
      needsPage(sp.lg + 4);
      drawText(a?.question || "", ML, 8.5, { color: C.ink, style: "bold" });
      gap(sp.xs);
      drawText(a?.answer || "—", ML + 3, 8, { color: C.inkMid });
      gap(sp.md);
      rule(3, CW - 3, C.border, 0.2);
    });
  }

  // ── Footer on every page ──────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    setColor("fill", [248, 248, 250]);
    doc.rect(0, PH - 10, PW, 10, "F");

    setColor("draw", C.border);
    doc.setLineWidth(0.25);
    doc.line(0, PH - 10, PW, PH - 10);

    doc.setFont("NotoSans", "normal");
    doc.setFontSize(6.5);
    setColor("text", C.muted);

    doc.text("Momentum", ML + 2.5, PH - 4);

    const footerTitle = normalizeDisplayText(
      project?.projectTitle || "Project Blueprint"
    );
    const footerFamily = chooseFont(footerTitle, "normal");
    doc.setFont(footerFamily, "normal");
    doc.text(processText(footerTitle).slice(0, 48), PW / 2, PH - 4, {
      align: "center",
    });

    doc.setFont("NotoSans", "normal");
    doc.text(`${p} / ${totalPages}`, PW - MR - 2.5, PH - 4, { align: "right" });
  }

  const filename = cleanFileName(project?.projectTitle || "momentum-project");
  doc.save(`${filename}.pdf`);
}
