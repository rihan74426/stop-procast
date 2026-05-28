/**
 * GET /api/cron/streak-check
 * Runs daily at 8 PM UTC via Vercel cron.
 * Resets streakDays to 0 for projects where lastActivityAt was > 1 day ago.
 * Protected by CRON_SECRET env var.
 */

import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await tryConnectDB();
  if (!db) {
    return Response.json(
      { ok: false, error: "DB unavailable" },
      { status: 503 }
    );
  }

  try {
    // Projects with streakDays > 0 but lastActivityAt > 1 day ago
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();

    const result = await Project.updateMany(
      {
        streakDays: { $gt: 0 },
        completionDate: null,
        lastActivityAt: { $lt: oneDayAgo },
      },
      { $set: { streakDays: 0 } }
    );

    console.log(`[cron/streak-check] reset ${result.modifiedCount} streaks`);
    return Response.json({ ok: true, reset: result.modifiedCount });
  } catch (err) {
    console.error("[cron/streak-check]", err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
