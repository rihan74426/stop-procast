import { auth } from "@clerk/nextjs/server";
import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

// Fields stripped from public (non-owner) responses
const PRIVATE_FIELDS = new Set([
  "userId",
  "sessionId",
  "isAnonymous",
  "__v",
  "_id",
]);

function stripPrivate(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!PRIVATE_FIELDS.has(k)) out[k] = v;
  }
  return out;
}

// PATCH /api/projects/[id]
export async function PATCH(request, { params }) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      userId: _u,
      id: _i,
      _id,
      __v,
      sessionId: _s,
      isAnonymous: _a,
      ...safePatch
    } = body;

    if (Object.keys(safePatch).length === 0) {
      return Response.json({ ok: true });
    }

    const db = await tryConnectDB();
    if (!db) return Response.json({ ok: true, warning: "DB unavailable" });

    if (userId) {
      await Project.findOneAndUpdate({ id, userId }, { $set: safePatch });
    } else {
      const sessionId = request.headers.get("X-Session-Id");
      if (sessionId) {
        await Project.findOneAndUpdate(
          { id, sessionId, isAnonymous: true },
          { $set: safePatch }
        );
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/projects/[id]:", err.message);
    return Response.json({ ok: true });
  }
}

// DELETE /api/projects/[id]
export async function DELETE(request, { params }) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    const db = await tryConnectDB();
    if (!db) return Response.json({ ok: true });

    if (userId) {
      await Project.deleteOne({ id, userId });
    } else {
      const sessionId = request.headers.get("X-Session-Id");
      if (sessionId) {
        await Project.deleteOne({ id, sessionId, isAnonymous: true });
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/projects/[id]:", err.message);
    return Response.json({ ok: true });
  }
}

/**
 * GET /api/projects/[id]
 *
 * Priority order:
 * 1. Authenticated owner   → full project data
 * 2. Anonymous + isPublic  → anonymized project data (no userId/sessionId)
 * 3. Not found / private   → 404
 *
 * This means any project with isPublic: true (the default) is accessible
 * to anyone with the ID — no login required.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const db = await tryConnectDB();
    if (!db) {
      return Response.json({ error: "DB unavailable" }, { status: 503 });
    }

    // Try authenticated owner first
    let isOwner = false;
    try {
      const { userId } = await auth();
      if (userId) {
        const project = await Project.findOne({ id, userId }).lean();
        if (project) {
          const { _id, __v, ...clean } = project;
          return Response.json({ project: clean, isOwner: true });
        }
        isOwner = false;
      }
    } catch {
      // auth() can throw if no Clerk session — that's fine, fall through to public
    }

    // Public access — return if isPublic: true (default for all projects)
    const project = await Project.findOne({ id, isPublic: true }).lean();
    if (!project) {
      return Response.json({ error: "Not found or private" }, { status: 404 });
    }

    const clean = stripPrivate(project);

    return Response.json(
      { project: clean, isOwner: false, isPublicView: true },
      {
        headers: {
          // Cache public project views briefly
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    console.error("GET /api/projects/[id]:", err.message);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
