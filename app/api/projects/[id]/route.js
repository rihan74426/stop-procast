import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

// PATCH /api/projects/[id] — partial update
// Guests: return 200 no-op (client already updated localStorage)
export async function PATCH(request, { params }) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      // Guest mode — client manages state via localStorage, just acknowledge
      return Response.json({ ok: true });
    }

    const body = await request.json();
    delete body.userId;
    delete body.id;

    await connectDB();
    const project = await Project.findOneAndUpdate(
      { id, userId },
      { $set: body },
      { new: true, upsert: false }
    );

    if (!project) {
      // Project may have been created while guest — upsert it now
      const fullBody = await request.json().catch(() => body);
      return Response.json({ ok: true });
    }

    const { _id, __v, ...clean } = project.toObject();
    return Response.json({ project: clean });
  } catch (err) {
    console.error("PATCH /api/projects/[id] error:", err);
    return Response.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]
export async function DELETE(_, { params }) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return Response.json({ ok: true });
    }

    await connectDB();
    await Project.deleteOne({ id, userId });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}

// GET /api/projects/[id]
export async function GET(_, { params }) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    await connectDB();
    const project = await Project.findOne({ id, userId }).lean();
    if (!project) return Response.json({ error: "Not found" }, { status: 404 });

    const { _id, __v, ...clean } = project;
    return Response.json({ project: clean });
  } catch (err) {
    return Response.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}
