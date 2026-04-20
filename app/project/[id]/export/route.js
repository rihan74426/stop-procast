import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

export async function GET(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    await connectDB();
    const { id } = await params;
    const project = await Project.findOne({ id, userId }).lean();

    if (!project) return new Response("Project not found", { status: 404 });

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "json";

    if (format === "markdown") {
      const md = toMarkdown(project);
      return new Response(md, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slug(
            project.projectTitle
          )}.md"`,
        },
      });
    }

    // Strip MongoDB internals
    const { _id, __v, ...clean } = project;
    return new Response(JSON.stringify(clean, null, 2), {
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
    lines.push("## Success criteria");
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

  (p.phases ?? []).forEach((phase, i) => {
    lines.push(`## Phase ${i + 1}: ${phase.name}`);
    lines.push(phase.objective);
    lines.push("");
    (phase.milestones ?? []).forEach((m) => {
      lines.push(`### ${m.name}`);
      if (m.deadline) lines.push(`**Deadline:** ${m.deadline}`);
      if (m.doneWhen) lines.push(`**Done when:** ${m.doneWhen}`);
      if (m.risk) lines.push(`**Risk:** ${m.risk}`);
      lines.push("");
      const tasks = (p.tasks ?? []).filter((t) => t.milestoneId === m.id);
      tasks.forEach((t) => {
        lines.push(`- [${t.status === "done" ? "x" : " "}] ${t.title}`);
      });
      if (tasks.length) lines.push("");
    });
  });

  if (p.blockers?.length) {
    lines.push("## Blockers");
    p.blockers.forEach((b) => {
      lines.push(
        `- ${b.description} (${
          b.status === "resolved" ? "resolved" : "active"
        })`
      );
    });
    lines.push("");
  }

  if (p.postmortem?.answers?.length) {
    lines.push("## Retrospective");
    p.postmortem.answers.forEach((a) => {
      lines.push(`**${a.question}**`);
      lines.push(a.answer);
      lines.push("");
    });
  }

  lines.push("---");
  lines.push(
    `*Exported from StopProcast on ${new Date().toLocaleDateString()}*`
  );
  return lines.join("\n");
}
