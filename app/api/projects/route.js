import { auth } from "@clerk/nextjs/server";
import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

// GET /api/projects
export async function GET(request) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ projects: [] });

    const db = await tryConnectDB();
    if (!db) return Response.json({ projects: [], warning: "DB unavailable" });

    const projects = await Project.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    const clean = projects.map(({ _id, __v, ...p }) => p);
    return Response.json({ projects: clean });
  } catch (err) {
    console.error("GET /api/projects:", err.message);
    return Response.json({ projects: [] });
  }
}

// POST /api/projects
export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Require a project id
    if (!body?.id) {
      return Response.json({ error: "Missing project id" }, { status: 400 });
    }

    const { userId } = await auth();
    const sessionId =
      body.sessionId || request.headers.get("X-Session-Id") || null;

    // Sanitize — never allow caller to spoof these server-set fields
    const { _id, __v, ...safeBody } = body;

    const db = await tryConnectDB();
    if (!db) {
      // DB down — acknowledge, client has local copy
      return Response.json({ project: safeBody }, { status: 201 });
    }

    if (userId) {
      // Authenticated: upsert by id (handles anon→auth promotion)
      const doc = await Project.findOneAndUpdate(
        { id: safeBody.id },
        {
          ...safeBody,
          userId,
          isAnonymous: false,
          sessionId: sessionId || null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      const { _id: _d, __v: _v, ...clean } = doc.toObject();
      return Response.json({ project: clean }, { status: 201 });
    }

    // Anonymous: save with sessionId
    try {
      // Check for existing doc first (idempotent)
      const existing = await Project.findOne({ id: safeBody.id }).lean();
      if (existing) {
        const { _id: _d, __v: _v, ...clean } = existing;
        return Response.json({ project: clean }, { status: 200 });
      }

      const doc = await Project.create({
        ...safeBody,
        userId: null,
        sessionId: sessionId || null,
        isAnonymous: true,
      });
      const { _id: _d, __v: _v, ...clean } = doc.toObject();
      return Response.json({ project: clean }, { status: 201 });
    } catch (dbErr) {
      // Duplicate key — race condition, return existing
      if (dbErr.code === 11000) {
        const existing = await Project.findOne({ id: safeBody.id }).lean();
        if (existing) {
          const { _id: _d, __v: _v, ...clean } = existing;
          return Response.json({ project: clean }, { status: 200 });
        }
        return Response.json({ project: safeBody }, { status: 200 });
      }
      throw dbErr;
    }
  } catch (err) {
    console.error("POST /api/projects:", err.message);
    return Response.json({ project: {} }, { status: 201 });
  }
}
