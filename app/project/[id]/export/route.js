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
    // 1. Try authenticated DB fetch first
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
    } catch {
      // Not authenticated or DB unavailable — fall through
    }

    // 2. Fall back to client-passed base64 data
    if (!project) {
      const encoded = searchParams.get("data");
      if (encoded) {
        project = decodeProjectData(encoded);
      }
    }

    if (!project) {
      return new Response("Project not found", { status: 404 });
    }

    const filename = slug(project.projectTitle);

    if (format === "markdown") {
      return new Response(toMarkdown(project), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.md"`,
        },
      });
    }

    // Default: JSON
    return new Response(JSON.stringify(project, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}.json"`,
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return new Response("Export failed", { status: 500 });
  }
}

/**
 * Decode base64-encoded project data from client.
 * Handles both encoding strategies used in the app.
 */
function decodeProjectData(encoded) {
  // Strategy 1: encodeURIComponent-then-btoa (used by toBase64Safe in page.jsx)
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    return JSON.parse(decodeURIComponent(decoded));
  } catch {
    // Strategy 2: plain base64 JSON
    try {
      return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
    } catch {
      return null;
    }
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

function toMarkdown(p) {
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

  if (p.scope) {
    const { mustHave = [], niceToHave = [], outOfScope = [] } = p.scope;
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

      // Tasks linked to this milestone
      const milestoneTasks =
        p.tasks?.filter((t) => t.milestoneId === m.id) ?? [];
      milestoneTasks.forEach((t) => {
        lines.push(`- [${t.status === "done" ? "x" : " "}] ${t.title}`);
      });
      if (milestoneTasks.length) lines.push("");
    });

    // Tasks in phase but not linked to a milestone
    const phaseTasks =
      p.tasks?.filter((t) => t.phaseId === phase.id && !t.milestoneId) ?? [];
    if (phaseTasks.length) {
      lines.push("**Tasks**");
      phaseTasks.forEach((t) => {
        lines.push(`- [${t.status === "done" ? "x" : " "}] ${t.title}`);
      });
      lines.push("");
    }
  });

  const activeblockers = p.blockers?.filter((b) => b.status === "active") ?? [];
  if (activeblockers.length) {
    lines.push("## Active Blockers");
    activeblockers.forEach((b) => lines.push(`- ${b.description}`));
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
