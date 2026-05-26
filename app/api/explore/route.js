/**
 * GET /api/explore
 * Public endpoint — returns paginated, anonymized public projects.
 * Supports ?category=&tag=&q=&page=&limit= filtering.
 * No auth required.
 */

import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

// Fields safe to expose publicly — explicitly allowlisted
const PUBLIC_PROJECTION = {
  id: 1,
  publicSlug: 1,
  projectTitle: 1,
  oneLineGoal: 1,
  problemStatement: 1,
  scopeLevel: 1,
  category: 1,
  tags: 1,
  publicQuality: 1,
  timeline: 1,
  estimatedEffort: 1,
  phases: 1,
  completionDate: 1,
  createdAt: 1,
  // Explicitly EXCLUDED: userId, sessionId, tasks (too detailed), blockers, postmortem
  _id: 0,
  __v: 0,
  userId: 0,
  sessionId: 0,
  isAnonymous: 0,
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");
    const q = searchParams.get("q")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(24, parseInt(searchParams.get("limit") ?? "12"));
    const skip = (page - 1) * limit;
    const sort = searchParams.get("sort") ?? "quality"; // quality | recent | popular

    const db = await tryConnectDB();
    if (!db) {
      return Response.json(
        { projects: [], total: 0, warning: "DB unavailable" },
        { status: 200 }
      );
    }

    // Build query
    const query = { isPublic: true, publicQuality: { $ne: null } };
    if (category && category !== "All") query.category = category;
    if (tag) query.tags = tag;
    if (q) {
      query.$or = [
        { projectTitle: { $regex: q, $options: "i" } },
        { oneLineGoal: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }

    // Sort
    const sortMap = {
      quality: { publicQuality: -1, completionDate: -1 },
      recent: { completionDate: -1 },
    };
    const sortOrder = sortMap[sort] ?? sortMap.quality;

    const [projects, total] = await Promise.all([
      Project.find(query, PUBLIC_PROJECTION)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments(query),
    ]);

    // Strip phases details to just names + objectives for the card view
    const lightweight = projects.map((p) => ({
      ...p,
      phases: (p.phases ?? []).map((ph) => ({
        id: ph.id,
        name: ph.name,
        objective: ph.objective,
        status: ph.status,
        milestoneCount: ph.milestones?.length ?? 0,
      })),
    }));

    return Response.json(
      { projects: lightweight, total, page, limit },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    console.error("[explore GET]", err.message);
    return Response.json({ projects: [], total: 0 }, { status: 200 });
  }
}
