import { auth } from "@clerk/nextjs/server";
import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

/**
 * GET /api/projects/check-limit
 *
 * Returns { allowed: bool, count: number, limit: number, authed: bool }
 *
 * Rules:
 *   - Authenticated users: always allowed (no cap server-side)
 *   - Anonymous users: max 1 project per sessionId
 *
 * This is the authoritative server-side check.
 * Client-side rateLimit.js is a UX hint only.
 */
export async function GET(request) {
  try {
    const { userId } = await auth();

    // Authenticated — unlimited
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
      // No session yet — first visit, always allow
      return Response.json({
        allowed: true,
        count: 0,
        limit: 1,
        authed: false,
      });
    }

    const db = await tryConnectDB();
    if (!db) {
      // DB down — fail open (don't punish user for our infra issues)
      return Response.json({
        allowed: true,
        count: 0,
        limit: 1,
        authed: false,
      });
    }

    const ANON_LIMIT = 1;

    // Count projects for this session (including any that haven't been claimed yet)
    const count = await Project.countDocuments({
      sessionId,
      userId: null, // only truly anonymous, not yet claimed
    });

    return Response.json({
      allowed: count < ANON_LIMIT,
      count,
      limit: ANON_LIMIT,
      authed: false,
    });
  } catch (err) {
    console.error("[check-limit]", err.message);
    // Fail open
    return Response.json({ allowed: true, count: 0, limit: 1, authed: false });
  }
}
