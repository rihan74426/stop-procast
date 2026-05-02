import { auth } from "@clerk/nextjs/server";
import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

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

    // Never allow patching these server-controlled fields
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
      return Response.json({ ok: true }); // no-op
    }

    const db = await tryConnectDB();
    if (!db) return Response.json({ ok: true, warning: "DB unavailable" });

    if (userId) {
      await Project.findOneAndUpdate({ id, userId }, { $set: safePatch });
    } else {
      // Anonymous patch — require sessionId match
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
    return Response.json({ ok: true }); // never block client
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

// GET /api/projects/[id]
export async function GET(request, { params }) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const db = await tryConnectDB();
    if (!db) {
      return Response.json({ error: "DB unavailable" }, { status: 503 });
    }

    const project = await Project.findOne({ id, userId }).lean();
    if (!project) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const { _id, __v, ...clean } = project;
    return Response.json({ project: clean });
  } catch (err) {
    console.error("GET /api/projects/[id]:", err.message);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
