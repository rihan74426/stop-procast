import { connectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";
import { auth } from "@clerk/nextjs/server";

// POST /api/export-email
// Body: { email, projectId, format, projectData? }
// Guests: projectData is passed directly (base64-encoded)
// Auth users: fetched from DB
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, projectId, format = "markdown", projectData } = body;

    if (!email || !email.includes("@")) {
      return Response.json({ error: "Valid email required" }, { status: 400 });
    }

    let project = null;

    // Try to load from DB if authenticated
    try {
      const { userId } = await auth();
      if (userId && projectId) {
        await connectDB();
        const doc = await Project.findOne({ id: projectId, userId }).lean();
        if (doc) {
          const { _id, __v, ...clean } = doc;
          project = clean;
        }
      }
    } catch {
      // Not authenticated — fall through to projectData
    }

    // Guests pass project data directly
    if (!project && projectData) {
      try {
        const decoded = Buffer.from(projectData, "base64").toString("utf-8");
        project = JSON.parse(decodeURIComponent(decoded));
      } catch {
        try {
          project = JSON.parse(
            Buffer.from(projectData, "base64").toString("utf-8")
          );
        } catch {
          return Response.json(
            { error: "Invalid project data" },
            { status: 400 }
          );
        }
      }
    }

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Generate content
    const markdownContent = toMarkdown(project);
    const jsonContent = JSON.stringify(project, null, 2);

    // Use Resend or a basic email service
    // We'll use the Resend API if configured, otherwise return a mock success
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      // Dev mode: just return success with content
      console.log(`[export-email] Would send to ${email}:`, {
        project: project.projectTitle,
        format,
      });
      return Response.json({
        ok: true,
        message:
          "Export sent (dev mode — configure RESEND_API_KEY to actually send)",
      });
    }

    // Send via Resend
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
  return (title || "project")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildEmailHtml(p) {
  const doneTasks = p.tasks?.filter((t) => t.status === "done").length ?? 0;
  const totalTasks = p.tasks?.length ?? 0;
  const progress =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Project Export: ${p.projectTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7f77dd 0%,#534ab7 100%);padding:32px;">
      <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;">MOMENTUM EXPORT</p>
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.2;">${
        p.projectTitle
      }</h1>
      <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);">${
        p.oneLineGoal || ""
      }</p>
    </div>

    <!-- Stats bar -->
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

    <!-- Body -->
    <div style="padding:24px 28px;">
      ${
        p.problemStatement
          ? `
      <h2 style="margin:0 0 8px;font-size:13px;font-weight:600;color:#9898a8;text-transform:uppercase;letter-spacing:0.5px;">Problem</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#2e2e38;line-height:1.6;">${p.problemStatement}</p>
      `
          : ""
      }

      ${
        p.successCriteria?.length
          ? `
      <h2 style="margin:0 0 10px;font-size:13px;font-weight:600;color:#9898a8;text-transform:uppercase;letter-spacing:0.5px;">Success Criteria</h2>
      <ul style="margin:0 0 20px;padding:0 0 0 20px;">
        ${p.successCriteria
          .map(
            (c) =>
              `<li style="margin-bottom:6px;font-size:14px;color:#2e2e38;">${c}</li>`
          )
          .join("")}
      </ul>
      `
          : ""
      }

      ${
        p.phases?.length
          ? `
      <h2 style="margin:0 0 12px;font-size:13px;font-weight:600;color:#9898a8;text-transform:uppercase;letter-spacing:0.5px;">Phases</h2>
      ${p.phases
        .map((phase, i) => {
          const phaseTasks =
            p.tasks?.filter((t) => t.phaseId === phase.id) || [];
          const donePhaseTasks = phaseTasks.filter(
            (t) => t.status === "done"
          ).length;
          return `
        <div style="margin-bottom:16px;padding:14px 16px;border-radius:10px;background:#f8f8fc;border-left:3px solid #7f77dd;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <p style="margin:0;font-size:14px;font-weight:600;color:#1c1c22;">Phase ${
              i + 1
            }: ${phase.name}</p>
            <span style="font-size:12px;color:#7f77dd;">${donePhaseTasks}/${
            phaseTasks.length
          }</span>
          </div>
          <p style="margin:0 0 8px;font-size:12px;color:#6b6b7e;">${
            phase.objective || ""
          }</p>
          ${phaseTasks
            .slice(0, 5)
            .map(
              (task) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:12px;color:${
              task.status === "done" ? "#1d9e75" : "#c8c8d4"
            };">${task.status === "done" ? "✓" : "○"}</span>
            <span style="font-size:12px;color:${
              task.status === "done" ? "#9898a8" : "#2e2e38"
            };${
                task.status === "done" ? "text-decoration:line-through;" : ""
              }">${task.title}</span>
          </div>`
            )
            .join("")}
          ${
            phaseTasks.length > 5
              ? `<p style="margin:4px 0 0;font-size:11px;color:#9898a8;">+${
                  phaseTasks.length - 5
                } more tasks</p>`
              : ""
          }
        </div>`;
        })
        .join("")}
      `
          : ""
      }
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;border-top:1px solid #eee;background:#f8f8fc;">
      <p style="margin:0;font-size:12px;color:#9898a8;text-align:center;">
        Exported from <strong>Momentum</strong> on ${new Date().toLocaleDateString()} · Your project files are attached above
      </p>
    </div>
  </div>
</body>
</html>`;
}

function toMarkdown(p) {
  const lines = [];
  lines.push(`# ${p.projectTitle}`);
  lines.push("");
  lines.push(`> ${p.oneLineGoal}`);
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
    lines.push(phase.objective || "");
    lines.push("");
    const phaseTasks = p.tasks?.filter((t) => t.phaseId === phase.id) || [];
    phaseTasks.forEach((t) => {
      lines.push(`- [${t.status === "done" ? "x" : " "}] ${t.title}`);
    });
    if (phaseTasks.length) lines.push("");
  });
  return lines.join("\n");
}
