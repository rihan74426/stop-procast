import { auth } from "@clerk/nextjs/server";
import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

// PATCH /api/projects/[id]
export async function PATCH(request, { params }) {
  try {
    const { userId } = await auth();
    const { id } = await params;
    const body = await request.json();

    delete body.userId;
    delete body.id;

    if (!userId) {
      // Anonymous patch — update by sessionId if available
      const sessionId = request.headers.get("X-Session-Id");
      if (sessionId) {
        const db = await tryConnectDB();
        if (db) {
          await Project.findOneAndUpdate(
            { id, sessionId, isAnonymous: true },
            { $set: body }
          );
        }
      }
      return Response.json({ ok: true });
    }

    const db = await tryConnectDB();
    if (!db) return Response.json({ ok: true, warning: "DB unavailable" });

    await Project.findOneAndUpdate({ id, userId }, { $set: body });
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
      if (sessionId) await Project.deleteOne({ id, sessionId });
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

    if (!userId) return Response.json({ error: "Not found" }, { status: 404 });

    const db = await tryConnectDB();
    if (!db) return Response.json({ error: "DB unavailable" }, { status: 503 });

    const project = await Project.findOne({ id, userId }).lean();
    if (!project) return Response.json({ error: "Not found" }, { status: 404 });

    const { _id, __v, ...clean } = project;
    return Response.json({ project: clean });
  } catch (err) {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
