/**
 * GET /api/explore/similar?q=<idea text>
 * Returns up to 3 similar public projects based on title/goal fuzzy match.
 *
 * Projection fix: pure inclusion only — no field:0 except _id.
 */

import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

const SIMILAR_PROJECTION = {
  _id: 0,
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
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 8) return Response.json({ projects: [] });

    const db = await tryConnectDB();
    if (!db) return Response.json({ projects: [] });

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
      "get",
      "do",
      "will",
      "can",
      "would",
      "have",
      "has",
      "had",
    ]);

    const keywords = q
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .slice(0, 6);

    if (keywords.length === 0) return Response.json({ projects: [] });

    const orClauses = keywords.flatMap((kw) => [
      { projectTitle: { $regex: kw, $options: "i" } },
      { oneLineGoal: { $regex: kw, $options: "i" } },
      { tags: { $regex: kw, $options: "i" } },
      { category: { $regex: kw, $options: "i" } },
    ]);

    const projects = await Project.find(
      { isPublic: { $ne: false }, $or: orClauses },
      SIMILAR_PROJECTION
    )
      .sort({ publicQuality: -1, createdAt: -1 })
      .limit(3)
      .lean();

    return Response.json(
      {
        projects: projects.map((p) => ({
          ...p,
          phases: (p.phases ?? []).map((ph) => ({
            name: ph.name,
            objective: ph.objective,
          })),
        })),
      },
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
