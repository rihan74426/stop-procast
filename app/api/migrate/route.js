/**
 * GET /api/migrate
 *
 * ONE-TIME migration route. Run this ONCE after deploying to backfill:
 *   1. isPublic: true  on every document that has no isPublic field
 *   2. views/stars/helpedCount/exportCount: 0  on docs without those fields
 *
 * Protected by CRON_SECRET (same secret used by cron jobs).
 * After running, you can delete this file or leave it — it is idempotent.
 *
 * Usage:
 *   curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.com/api/migrate
 */

import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

const CRON_SECRET = process.env.CRON_SECRET_KEY;

export async function GET(request) {
  const authHeader = request.headers.get("authorization");

  // In production, require the secret. In dev, allow without it.
  if (
    process.env.NODE_ENV === "production" &&
    CRON_SECRET &&
    authHeader !== `Bearer ${CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await tryConnectDB();
  if (!db) {
    return Response.json({ error: "DB unavailable" }, { status: 503 });
  }

  try {
    // 1. Backfill isPublic: true on documents that have no isPublic field at all
    const publicResult = await Project.updateMany(
      { isPublic: { $exists: false } },
      { $set: { isPublic: true } }
    );

    // 2. Backfill engagement counters that might be missing
    const engageResult = await Project.updateMany(
      {
        $or: [
          { views: { $exists: false } },
          { stars: { $exists: false } },
          { helpedCount: { $exists: false } },
          { exportCount: { $exists: false } },
        ],
      },
      {
        $set: {
          views: 0,
          stars: 0,
          helpedCount: 0,
          exportCount: 0,
          starredBy: [],
          helpedBy: [],
        },
      }
    );

    // 3. Report how many docs exist total
    const total = await Project.countDocuments({});
    const publicCount = await Project.countDocuments({
      isPublic: { $ne: false },
    });

    return Response.json({
      ok: true,
      total_documents: total,
      public_documents: publicCount,
      backfilled_isPublic: publicResult.modifiedCount,
      backfilled_engagement: engageResult.modifiedCount,
      message:
        publicResult.modifiedCount > 0
          ? `Backfilled ${publicResult.modifiedCount} documents with isPublic:true. Explore should now show ${publicCount} projects.`
          : `No backfill needed. ${publicCount} of ${total} documents are public.`,
    });
  } catch (err) {
    console.error("[migrate]", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
