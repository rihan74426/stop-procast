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
// Called for EVERY new project — anonymous or authenticated
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId } = await auth();

    // Get sessionId from body or header
    const sessionId =
      body.sessionId || request.headers.get("X-Session-Id") || null;

    const db = await tryConnectDB();

    if (!db) {
      // DB down — acknowledge, client has local copy
      return Response.json({ project: body }, { status: 201 });
    }

    if (userId) {
      // Authenticated: upsert (handles case where saved as anon first)
      const doc = await Project.findOneAndUpdate(
        { id: body.id },
        { ...body, userId, isAnonymous: false, sessionId: sessionId || null },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      const { _id, __v, ...clean } = doc.toObject();
      return Response.json({ project: clean }, { status: 201 });
    }

    // Anonymous: save with sessionId for later claiming
    try {
      const existing = await Project.findOne({ id: body.id });
      if (existing) {
        // Already saved (duplicate call) — just return it
        const { _id, __v, ...clean } = existing.toObject();
        return Response.json({ project: clean }, { status: 200 });
      }

      const doc = await Project.create({
        ...body,
        userId: null,
        sessionId: sessionId || null,
        isAnonymous: true,
      });
      const { _id, __v, ...clean } = doc.toObject();
      return Response.json({ project: clean }, { status: 201 });
    } catch (dbErr) {
      // Duplicate key — already exists
      if (dbErr.code === 11000) {
        return Response.json({ project: body }, { status: 200 });
      }
      throw dbErr;
    }
  } catch (err) {
    console.error("POST /api/projects:", err.message);
    // Always return 201 so client doesn't think it failed
    return Response.json({ project: {} }, { status: 201 });
  }
}
