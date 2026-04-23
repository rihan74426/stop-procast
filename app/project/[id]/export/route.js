import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

// GET /project/[id]/export?format=json|markdown&data=<base64>
export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";

  let project = null;

  try {
    const { userId } = await auth();

    if (userId) {
      await connectDB();
      const doc = await Project.findOne({ id, userId }).lean();
      if (doc) {
        const { _id, __v, ...clean } = doc;
        project = clean;
      }
    }

    if (!project) {
      const encoded = searchParams.get("data");
      if (encoded) {
        try {
          // Server uses Buffer — handles ALL Unicode (Arabic, Chinese, emoji, etc.)
          // Client used encodeURIComponent-based btoa to produce this base64
          const decoded = Buffer.from(encoded, "base64").toString("utf-8");
          project = JSON.parse(decodeURIComponent(decoded));
        } catch {
          // Fallback: try direct base64 decode (older format)
          try {
            project = JSON.parse(
              Buffer.from(encoded, "base64").toString("utf-8")
            );
          } catch {
            return new Response("Invalid project data", { status: 400 });
          }
        }
      }
    }

    if (!project) {
      return new Response("Project not found", { status: 404 });
    }

    if (format === "markdown") {
      return new Response(toMarkdown(project), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slug(
            project.projectTitle
          )}.md"`,
        },
      });
    }

    return new Response(JSON.stringify(project, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${slug(
          project.projectTitle
        )}.json"`,
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return new Response("Export failed", { status: 500 });
  }
}

function slug(title) {
  return (title || "project")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
  if (p.targetUser) {
    lines.push(`**Target user:** ${p.targetUser}`);
    lines.push("");
  }
  if (p.successCriteria?.length) {
    lines.push("## Success Criteria");
    p.successCriteria.forEach((c) => lines.push(`- ${c}`));
    lines.push("");
  }
  if (p.scope) {
    lines.push("## Scope");
    if (p.scope.mustHave?.length) {
      lines.push("**Must have**");
      p.scope.mustHave.forEach((s) => lines.push(`- ${s}`));
    }
    if (p.scope.niceToHave?.length) {
      lines.push("**Nice to have**");
      p.scope.niceToHave.forEach((s) => lines.push(`- ${s}`));
    }
    if (p.scope.outOfScope?.length) {
      lines.push("**Out of scope**");
      p.scope.outOfScope.forEach((s) => lines.push(`- ${s}`));
    }
    lines.push("");
  }
  p.phases?.forEach((phase, i) => {
    lines.push(`## Phase ${i + 1}: ${phase.name}`);
    lines.push(phase.objective || "");
    lines.push("");
    phase.milestones?.forEach((m) => {
      lines.push(`### ${m.name}`);
      if (m.deadline) lines.push(`**Deadline:** ${m.deadline}`);
      if (m.doneWhen) lines.push(`**Done when:** ${m.doneWhen}`);
      if (m.risk) lines.push(`**Risk:** ${m.risk}`);
      lines.push("");
      const tasks = p.tasks?.filter((t) => t.milestoneId === m.id) ?? [];
      tasks.forEach((t) => {
        lines.push(`- [${t.status === "done" ? "x" : " "}] ${t.title}`);
      });
      if (tasks.length) lines.push("");
    });
  });
  if (p.blockers?.length) {
    lines.push("## Blockers");
    p.blockers.forEach((b) => {
      const s = b.status === "resolved" ? "~~resolved~~" : "**active**";
      lines.push(`- ${b.description} (${s})`);
    });
    lines.push("");
  }
  if (p.toolsSuggested?.length) {
    lines.push("## Suggested Tools");
    p.toolsSuggested.forEach((t) => lines.push(`- ${t}`));
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
