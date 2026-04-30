import { auth } from "@clerk/nextjs/server";
import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

// POST /api/projects/claim
// Body: { sessionId }
// Transfers all anonymous session projects to the now-authenticated user
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { sessionId } = await request.json();
    if (!sessionId) {
      return Response.json({ claimed: 0 });
    }

    const db = await tryConnectDB();
    if (!db) {
      return Response.json({ claimed: 0, warning: "DB unavailable" });
    }

    const result = await Project.updateMany(
      { sessionId, isAnonymous: true, userId: null },
      { $set: { userId, isAnonymous: false } }
    );

    console.log(`[claim] ${result.modifiedCount} projects → user ${userId}`);
    return Response.json({ claimed: result.modifiedCount });
  } catch (err) {
    console.error("[claim]", err.message);
    return Response.json({ claimed: 0 });
  }
}
