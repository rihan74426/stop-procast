import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

// GET /api/projects — fetch all projects for the signed-in user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const projects = await Project.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    // Strip MongoDB _id and __v from response
    const clean = projects.map(({ _id, __v, ...p }) => p);
    return Response.json({ projects: clean });
  } catch (err) {
    console.error("GET /api/projects error:", err);
    return Response.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects — create a new project
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    await connectDB();

    const project = await Project.create({ ...body, userId });
    const { _id, __v, ...clean } = project.toObject();
    return Response.json({ project: clean }, { status: 201 });
  } catch (err) {
    console.error("POST /api/projects error:", err);
    return Response.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
