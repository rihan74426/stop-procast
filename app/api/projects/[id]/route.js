import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

// Shared ownership check
async function getOwnedProject(userId, id) {
  const project = await Project.findOne({ id, userId });
  return project;
}

// GET /api/projects/[id]
export async function GET(_, { params }) {
  try {
    const { userId } = await auth();
    if (!userId)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { id } = await params;
    const project = await getOwnedProject(userId, id);
    if (!project) return Response.json({ error: "Not found" }, { status: 404 });

    const { _id, __v, ...clean } = project.toObject();
    return Response.json({ project: clean });
  } catch (err) {
    return Response.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

// PATCH /api/projects/[id] — partial update (any field)
export async function PATCH(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // Prevent overwriting userId
    delete body.userId;
    delete body.id;

    const project = await Project.findOneAndUpdate(
      { id, userId },
      { $set: body },
      { new: true }
    );
    if (!project) return Response.json({ error: "Not found" }, { status: 404 });

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
    if (!userId)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { id } = await params;
    const result = await Project.deleteOne({ id, userId });
    if (result.deletedCount === 0)
      return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
