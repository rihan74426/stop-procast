/**
 * GET /api/explore/similar?q=<idea text>
 * Returns up to 3 similar public projects based on title/goal fuzzy match.
 * Used by /new to show "a similar project already exists" before AI generation.
 */

import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

const SIMILAR_PROJECTION = {
  id: 1,
  publicSlug: 1,
  projectTitle: 1,
  oneLineGoal: 1,
  scopeLevel: 1,
  category: 1,
  tags: 1,
  publicQuality: 1,
  phases: 1,
  completionDate: 1,
  _id: 0,
  userId: 0,
  sessionId: 0,
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 8) {
      return Response.json({ projects: [] });
    }

    const db = await tryConnectDB();
    if (!db) {
      return Response.json({ projects: [] });
    }

    // Extract meaningful keywords (skip common stop words)
    const stopWords = new Set([
      "a",
      "an",
      "the",
      "i",
      "want",
      "need",
      "to",
      "my",
      "and",
      "or",
      "for",
      "with",
      "in",
      "on",
      "of",
      "that",
      "is",
      "it",
      "be",
      "by",
      "this",
      "how",
      "what",
      "create",
      "make",
      "build",
      "learn",
      "start",
    ]);

    const keywords = q
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .slice(0, 5);

    if (keywords.length === 0) {
      return Response.json({ projects: [] });
    }

    // Search using keyword OR regex
    const orClauses = keywords.map((kw) => ({
      $or: [
        { projectTitle: { $regex: kw, $options: "i" } },
        { oneLineGoal: { $regex: kw, $options: "i" } },
        { tags: { $regex: kw, $options: "i" } },
      ],
    }));

    const projects = await Project.find(
      {
        isPublic: true,
        publicQuality: { $gte: 72 },
        $and: [{ $or: orClauses.flatMap((c) => c.$or) }],
      },
      SIMILAR_PROJECTION
    )
      .sort({ publicQuality: -1 })
      .limit(3)
      .lean();

    const lightweight = projects.map((p) => ({
      ...p,
      phases: (p.phases ?? []).map((ph) => ({
        name: ph.name,
        objective: ph.objective,
      })),
    }));

    return Response.json(
      { projects: lightweight },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    console.error("[explore/similar]", err.message);
    return Response.json({ projects: [] });
  }
}
