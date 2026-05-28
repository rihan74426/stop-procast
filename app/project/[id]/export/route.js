import { auth } from "@clerk/nextjs/server";
import { tryConnectDB } from "@/lib/db/mongoose"; // was connectDB — throws on failure
import Project from "@/lib/models/Project";
import { toMarkdown, projectSlug } from "@/lib/utils/toMarkdown";

const MAX_PAYLOAD_BYTES = 500 * 1024; // 500 KB

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
        const db = await tryConnectDB(); // graceful — never throws
        if (db) {
          const doc = await Project.findOne({ id, userId }).lean();
          if (doc) {
            const { _id, __v, ...clean } = doc;
            project = clean;
          }
        }
      }
    } catch {
      // Not authenticated or DB unavailable — fall through to client data
    }

    // 2. Fall back to client-passed base64 data
    if (!project) {
      const encoded = searchParams.get("data");
      if (encoded) {
        // Guard against excessively large payloads
        if (encoded.length > MAX_PAYLOAD_BYTES) {
          return new Response("Payload too large", { status: 413 });
        }
        project = decodeProjectData(encoded);
      }
    }

    if (!project) {
      return new Response("Project not found", { status: 404 });
    }

    const filename = projectSlug(project.projectTitle);

    if (format === "markdown") {
      return new Response(toMarkdown(project), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.md"`,
        },
      });
    }

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

function decodeProjectData(encoded) {
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    return JSON.parse(decodeURIComponent(decoded));
  } catch {
    try {
      return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
    } catch {
      return null;
    }
  }
}
