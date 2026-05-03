import { auth } from "@clerk/nextjs/server";
import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

const ANON_LIMIT = 1;
const AUTH_LIMIT = 4;

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

// POST /api/projects — with server-side limit enforcement
export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body?.id) {
      return Response.json({ error: "Missing project id" }, { status: 400 });
    }

    const { userId } = await auth();
    const sessionId =
      body.sessionId || request.headers.get("X-Session-Id") || null;

    const { _id, __v, ...safeBody } = body;

    const db = await tryConnectDB();
    if (!db) {
      // DB down — acknowledge, client has local copy
      return Response.json({ project: safeBody }, { status: 201 });
    }

    if (userId) {
      // Check authenticated user limit
      const existingDoc = await Project.findOne({ id: safeBody.id }).lean();
      if (!existingDoc) {
        const count = await Project.countDocuments({ userId });
        if (count >= AUTH_LIMIT) {
          return Response.json(
            {
              error: "Project limit reached. Upgrade to create more.",
              code: "LIMIT_REACHED",
              limit: AUTH_LIMIT,
            },
            { status: 403 },
          );
        }
      }

      const doc = await Project.findOneAndUpdate(
        { id: safeBody.id },
        {
          ...safeBody,
          userId,
          isAnonymous: false,
          sessionId: sessionId || null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      const { _id: _d, __v: _v, ...clean } = doc.toObject();
      return Response.json({ project: clean }, { status: 201 });
    }

    // Anonymous user — check limit
    const existing = await Project.findOne({ id: safeBody.id }).lean();
    if (existing) {
      const { _id: _d, __v: _v, ...clean } = existing;
      return Response.json({ project: clean }, { status: 200 });
    }

    const anonCount = await Project.countDocuments({ sessionId, userId: null });
    if (anonCount >= ANON_LIMIT) {
      return Response.json(
        {
          error: "Free limit reached. Sign up to create more projects.",
          code: "LIMIT_REACHED",
          limit: ANON_LIMIT,
        },
        { status: 403 },
      );
    }

    try {
      const doc = await Project.create({
        ...safeBody,
        userId: null,
        sessionId: sessionId || null,
        isAnonymous: true,
      });
      const { _id: _d, __v: _v, ...clean } = doc.toObject();
      return Response.json({ project: clean }, { status: 201 });
    } catch (dbErr) {
      if (dbErr.code === 11000) {
        const existing2 = await Project.findOne({ id: safeBody.id }).lean();
        if (existing2) {
          const { _id: _d, __v: _v, ...clean } = existing2;
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
