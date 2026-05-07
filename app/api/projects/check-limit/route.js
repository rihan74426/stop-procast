import { auth } from "@clerk/nextjs/server";
import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

const ANON_LIMIT = 1;
const AUTH_LIMIT = 4; // matches route.js

/**
 * GET /api/projects/check-limit
 * Returns { allowed, count, limit, authed }
 */
export async function GET(request) {
  try {
    const { userId } = await auth();
    const db = await tryConnectDB();

    if (userId) {
      if (!db) {
        return Response.json({
          allowed: true,
          count: 0,
          limit: AUTH_LIMIT,
          authed: true,
        });
      }
      const count = await Project.countDocuments({ userId });
      return Response.json({
        allowed: count < AUTH_LIMIT,
        count,
        limit: AUTH_LIMIT,
        authed: true,
      });
    }

    // Anonymous
    const sessionId = request.headers.get("X-Session-Id");
    if (!sessionId || !db) {
      return Response.json({
        allowed: true,
        count: 0,
        limit: ANON_LIMIT,
        authed: false,
      });
    }

    const count = await Project.countDocuments({ sessionId, userId: null });
    return Response.json({
      allowed: count < ANON_LIMIT,
      count,
      limit: ANON_LIMIT,
      authed: false,
    });
  } catch (err) {
    console.error("[check-limit]", err.message);
    // Fail open — never block on our error
    return Response.json({
      allowed: true,
      count: 0,
      limit: ANON_LIMIT,
      authed: false,
    });
  }
}
