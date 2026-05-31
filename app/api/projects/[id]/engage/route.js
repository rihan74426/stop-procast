/**
 * POST /api/projects/[id]/engage
 * Tracks views, stars, helped marks, and export counts.
 * No auth required — uses sessionId or userId as actor identifier.
 *
 * Body: { action: 'view' | 'star' | 'unstar' | 'helped' | 'export', actorId: string }
 *
 * - view:   increment views (fire-and-forget, no dedup)
 * - star:   toggle star for actorId (idempotent per actor)
 * - unstar: remove star for actorId
 * - helped: mark as helped (idempotent per actor)
 * - export: increment exportCount
 */

import { auth } from "@clerk/nextjs/server";
import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { action, actorId } = body;

    if (!["view", "star", "unstar", "helped", "export"].includes(action)) {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    const db = await tryConnectDB();
    if (!db) {
      return Response.json({ ok: true, warning: "DB unavailable" });
    }

    // Resolve actor identifier — prefer authenticated userId
    let actor = actorId || null;
    try {
      const { userId } = await auth();
      if (userId) actor = userId;
    } catch {
      /* not authenticated — use provided actorId */
    }

    let update = {};
    let arrayFilter = {};

    switch (action) {
      case "view":
        // Simple increment — no dedup needed for views
        update = { $inc: { views: 1 } };
        break;

      case "star":
        if (!actor) {
          return Response.json(
            { error: "Actor required for star" },
            { status: 400 }
          );
        }
        // Idempotent: only increment if actor not already in starredBy
        {
          const existing = await Project.findOne({
            id,
            starredBy: actor,
          }).lean();
          if (existing) {
            // Already starred — return current state without double-counting
            const { _id, __v, ...clean } = existing;
            return Response.json({
              ok: true,
              alreadyStarred: true,
              stars: existing.stars ?? 0,
            });
          }
          update = {
            $inc: { stars: 1 },
            $addToSet: { starredBy: actor },
          };
        }
        break;

      case "unstar":
        if (!actor) {
          return Response.json(
            { error: "Actor required for unstar" },
            { status: 400 }
          );
        }
        update = {
          $inc: { stars: -1 },
          $pull: { starredBy: actor },
        };
        break;

      case "helped":
        if (!actor) {
          return Response.json(
            { error: "Actor required for helped" },
            { status: 400 }
          );
        }
        {
          const existing = await Project.findOne({
            id,
            helpedBy: actor,
          }).lean();
          if (existing) {
            return Response.json({
              ok: true,
              alreadyMarked: true,
              helpedCount: existing.helpedCount ?? 0,
            });
          }
          update = {
            $inc: { helpedCount: 1 },
            $addToSet: { helpedBy: actor },
          };
        }
        break;

      case "export":
        update = { $inc: { exportCount: 1 } };
        break;
    }

    const doc = await Project.findOneAndUpdate({ id }, update, {
      new: true,
      projection: { stars: 1, helpedCount: 1, views: 1, exportCount: 1 },
    }).lean();

    if (!doc) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    return Response.json({
      ok: true,
      stars: doc.stars ?? 0,
      helpedCount: doc.helpedCount ?? 0,
      views: doc.views ?? 0,
      exportCount: doc.exportCount ?? 0,
    });
  } catch (err) {
    console.error("[engage]", err.message);
    return Response.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}

/**
 * GET /api/projects/[id]/engage
 * Returns engagement counts for a project (public).
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const db = await tryConnectDB();
    if (!db)
      return Response.json({
        stars: 0,
        helpedCount: 0,
        views: 0,
        exportCount: 0,
      });

    const doc = await Project.findOne(
      { id },
      {
        stars: 1,
        helpedCount: 1,
        views: 1,
        exportCount: 1,
        starredBy: 1,
        helpedBy: 1,
      }
    ).lean();

    if (!doc)
      return Response.json({
        stars: 0,
        helpedCount: 0,
        views: 0,
        exportCount: 0,
      });

    return Response.json({
      stars: doc.stars ?? 0,
      helpedCount: doc.helpedCount ?? 0,
      views: doc.views ?? 0,
      exportCount: doc.exportCount ?? 0,
    });
  } catch (err) {
    console.error("[engage GET]", err.message);
    return Response.json({
      stars: 0,
      helpedCount: 0,
      views: 0,
      exportCount: 0,
    });
  }
}
