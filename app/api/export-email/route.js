import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";
import { auth } from "@clerk/nextjs/server";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Decode the Unicode-safe base64 encoding produced by EmailExportModal.
 * The client encodes with TextEncoder → binary string → btoa, so we
 * reverse: atob → Uint8Array → TextDecoder.
 */
function decodeProjectData(encoded) {
  if (!encoded) return null;
  try {
    // First try the Unicode-safe path (new encoding)
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch {
    // Fallback: try old encoding (encodeURIComponent + btoa)
    try {
      const binary = atob(encoded);
      return JSON.parse(decodeURIComponent(binary));
    } catch {
      // Last resort: plain base64 JSON
      try {
        return JSON.parse(atob(encoded));
      } catch {
        return null;
      }
    }
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { email, projectId, format = "markdown", projectData } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Valid email required" }, { status: 400 });
    }

    let project = null;

    // Try to load from DB if authenticated
    try {
      const { userId } = await auth();
      if (userId && projectId) {
        const db = await tryConnectDB();
        if (db) {
          const doc = await Project.findOne({ id: projectId, userId }).lean();
          if (doc) {
            const { _id, __v, ...clean } = doc;
            project = clean;
          }
        }
      }
    } catch {
      // Not authenticated or DB unavailable — fall through to projectData
    }

    // Decode client-passed project data (works for all users including guests)
    if (!project && projectData) {
      project = decodeProjectData(projectData);
    }

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      if (isDev) {
        console.log(`[export-email] DEV MODE — would send to ${email}:`, {
          project: project.projectTitle,
          format,
        });
        return Response.json({
          ok: true,
          message:
            "Dev mode — configure RESEND_API_KEY to actually send email.",
        });
      }
      console.error("[export-email] RESEND_API_KEY is not set in production");
      return Response.json(
        {
          error:
            "Email service is not configured. Please export as PDF or Markdown instead.",
        },
        { status: 503 }
      );
    }

    const markdownContent = toMarkdown(project);
    const jsonContent = JSON.stringify(project, null, 2);

    const attachments = [];
    if (format === "markdown" || format === "both") {
      attachments.push({
        filename: `${slug(project.projectTitle)}.md`,
        content: Buffer.from(markdownContent).toString("base64"),
      });
    }
    if (format === "json" || format === "both") {
      attachments.push({
        filename: `${slug(project.projectTitle)}.json`,
        content: Buffer.from(jsonContent).toString("base64"),
      });
    }

    const emailPayload = {
      from: "Momentum <exports@momentum-app.com>",
      to: [email],
      subject: `Your project export: ${project.projectTitle}`,
      html: buildEmailHtml(project),
      attachments,
    };

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("[export-email] Resend error:", errText);
      return Response.json({ error: "Email service error" }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[export-email] error:", err);
    return Response.json({ error: "Failed to send export" }, { status: 500 });
  }
}

function slug(title) {
  return (
    (title || "project")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "momentum-project"
  );
}

function buildEmailHtml(p) {
  const doneTasks = p.tasks?.filter((t) => t.status === "done").length ?? 0;
  const totalTasks = p.tasks?.length ?? 0;
  const progress =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Project Export: ${p.projectTitle}</title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#7f77dd 0%,#534ab7 100%);padding:32px;">
    <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;">MOMENTUM EXPORT</p>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#fff;">${
      p.projectTitle
    }</h1>
    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);">${
      p.oneLineGoal || ""
    }</p>
  </div>
  <div style="display:flex;border-bottom:1px solid #eee;">
    <div style="flex:1;padding:16px 20px;text-align:center;border-right:1px solid #eee;">
      <p style="margin:0 0 2px;font-size:22px;font-weight:700;color:#7f77dd;">${progress}%</p>
      <p style="margin:0;font-size:11px;color:#9898a8;text-transform:uppercase;">Progress</p>
    </div>
    <div style="flex:1;padding:16px 20px;text-align:center;border-right:1px solid #eee;">
      <p style="margin:0 0 2px;font-size:22px;font-weight:700;color:#1d9e75;">${doneTasks}</p>
      <p style="margin:0;font-size:11px;color:#9898a8;text-transform:uppercase;">Tasks Done</p>
    </div>
    <div style="flex:1;padding:16px 20px;text-align:center;">
      <p style="margin:0 0 2px;font-size:22px;font-weight:700;color:#ba7517;">${
        p.phases?.length ?? 0
      }</p>
      <p style="margin:0;font-size:11px;color:#9898a8;text-transform:uppercase;">Phases</p>
    </div>
  </div>
  <div style="padding:24px 28px;">
    <p style="margin:0;font-size:12px;color:#9898a8;text-align:center;">
      Exported from <strong>Momentum</strong> on ${new Date().toLocaleDateString()} · Your files are attached
    </p>
  </div>
</div>
</body></html>`;
}

function toMarkdown(p) {
  const lines = [];
  lines.push(`# ${p.projectTitle}`);
  lines.push("");
  if (p.oneLineGoal) lines.push(`> ${p.oneLineGoal}`);
  lines.push(`*Exported from Momentum on ${new Date().toLocaleDateString()}*`);
  lines.push("");
  if (p.problemStatement) {
    lines.push("## Problem");
    lines.push(p.problemStatement);
    lines.push("");
  }
  if (p.successCriteria?.length) {
    lines.push("## Success Criteria");
    p.successCriteria.forEach((c) => lines.push(`- ${c}`));
    lines.push("");
  }
  p.phases?.forEach((phase, i) => {
    lines.push(`## Phase ${i + 1}: ${phase.name}`);
    if (phase.objective) lines.push(phase.objective);
    lines.push("");
    const phaseTasks = p.tasks?.filter((t) => t.phaseId === phase.id) || [];
    phaseTasks.forEach((t) =>
      lines.push(`- [${t.status === "done" ? "x" : " "}] ${t.title}`)
    );
    if (phaseTasks.length) lines.push("");
  });
  const activeBlockers = p.blockers?.filter((b) => b.status === "active") ?? [];
  if (activeBlockers.length) {
    lines.push("## Active Blockers");
    activeBlockers.forEach((b) => lines.push(`- ${b.description}`));
    lines.push("");
  }
  return lines.join("\n");
}
