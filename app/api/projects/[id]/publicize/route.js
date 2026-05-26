/**
 * POST /api/projects/[id]/publicize
 * Scores project quality via AI, categorizes it, and marks isPublic=true
 * if score >= threshold. Only callable by the project owner.
 */

import { auth } from "@clerk/nextjs/server";
import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";
import {
  scoreAndCategorize,
  PUBLIC_QUALITY_THRESHOLD,
} from "@/lib/ai/publicize";

export async function POST(request, { params }) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = await tryConnectDB();
    if (!db) {
      return Response.json({ error: "DB unavailable" }, { status: 503 });
    }

    // Verify ownership and that project is completed
    const project = await Project.findOne({ id, userId }).lean();
    if (!project) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    if (!project.completionDate) {
      return Response.json(
        { error: "Project must be completed before publicizing." },
        { status: 400 }
      );
    }

    // Run AI scoring + categorization
    let result;
    try {
      result = await scoreAndCategorize(project);
    } catch (err) {
      console.error("[publicize] AI failed:", err.message);
      return Response.json(
        { error: "AI scoring failed. Try again shortly." },
        { status: 500 }
      );
    }

    const { score, reason, category, tags, publicSlug } = result;
    const qualifies = score >= PUBLIC_QUALITY_THRESHOLD;

    // Update project regardless — save quality score + category for user's info
    const patch = {
      publicQuality: score,
      category,
      tags,
      isPublic: qualifies,
      publicSlug: qualifies ? publicSlug : null,
    };

    await Project.findOneAndUpdate({ id, userId }, { $set: patch });

    return Response.json({
      ok: true,
      score,
      reason,
      category,
      tags,
      qualifies,
      threshold: PUBLIC_QUALITY_THRESHOLD,
      publicSlug: qualifies ? publicSlug : null,
    });
  } catch (err) {
    console.error("[publicize]", err.message);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/publicize — unpublish a project
 */
export async function DELETE(request, { params }) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = await tryConnectDB();
    if (!db) {
      return Response.json({ error: "DB unavailable" }, { status: 503 });
    }

    await Project.findOneAndUpdate(
      { id, userId },
      { $set: { isPublic: false, publicSlug: null } }
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[unpublish]", err.message);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
