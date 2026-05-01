import { auth } from "@clerk/nextjs/server";
import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

/**
 * GET /api/projects/check-limit
 *
 * Returns { allowed: bool, count: number, limit: number }
 * Called before generation begins so StepReview can gate properly.
 *
 * Rules:
 *   - Authenticated users: always allowed (no server-side cap here)
 *   - Anonymous users: max 1 project per sessionId
 *
 * This is the server-enforced check — client-side rateLimit.js is
 * a UX hint only and can be bypassed. This cannot.
 */
export async function GET(request) {
  try {
    const { userId } = await auth();

    // Authenticated — no limit enforced server-side
    if (userId) {
      return Response.json({
        allowed: true,
        count: 0,
        limit: null,
        authed: true,
      });
    }

    const sessionId = request.headers.get("X-Session-Id");

    if (!sessionId) {
      // No session yet — first visit, allow
      return Response.json({
        allowed: true,
        count: 0,
        limit: 1,
        authed: false,
      });
    }

    const db = await tryConnectDB();
    if (!db) {
      // DB down — allow optimistically (fail open, not closed)
      return Response.json({
        allowed: true,
        count: 0,
        limit: 1,
        authed: false,
      });
    }

    const count = await Project.countDocuments({
      sessionId,
      isAnonymous: true,
      userId: null,
    });

    const ANON_LIMIT = 1;
    return Response.json({
      allowed: count < ANON_LIMIT,
      count,
      limit: ANON_LIMIT,
      authed: false,
    });
  } catch (err) {
    console.error("[check-limit]", err.message);
    // Fail open — don't block the user on a server error
    return Response.json({ allowed: true, count: 0, limit: 1, authed: false });
  }
}
