/**
 * GET /api/explore
 *
 * CRITICAL FIX: projection was mixing field:1 (include) and field:0 (exclude).
 * MongoDB forbids this — only _id:0 is allowed alongside includes.
 * That caused a MongoServerError that was silently caught, returning [].
 *
 * Fix: use ONLY inclusion projection (field:1). Sensitive fields are simply
 * omitted from the include list rather than explicitly excluded.
 *
 * Query uses { isPublic: { $ne: false } } so legacy docs without the field
 * are treated as public (the intended default).
 */

import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

// ONLY inclusion fields + _id:0 (the one allowed exception).
// Do NOT add any field:0 lines here — that breaks MongoDB.
const PUBLIC_PROJECTION = {
  _id: 0,
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
  isPublic: 1,
  // Engagement counters
  views: 1,
  stars: 1,
  helpedCount: 1,
  exportCount: 1,
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
    const sort = searchParams.get("sort") ?? "quality";

    const db = await tryConnectDB();
    if (!db) {
      return Response.json(
        { projects: [], total: 0, warning: "DB unavailable" },
        { status: 200 }
      );
    }

    // $ne: false treats undefined/null as public — covers all legacy documents
    const query = { isPublic: { $ne: false } };

    if (category && category !== "All") query.category = category;
    if (tag) query.tags = tag;
    if (q) {
      query.$or = [
        { projectTitle: { $regex: q, $options: "i" } },
        { oneLineGoal: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
      ];
    }

    const sortMap = {
      quality: { publicQuality: -1, createdAt: -1 },
      recent: { createdAt: -1 },
      stars: { stars: -1, createdAt: -1 },
      completed: { completionDate: -1, createdAt: -1 },
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

    // Slim down phases for card view; fill in missing engagement defaults
    const lightweight = projects.map((p) => ({
      ...p,
      views: p.views ?? 0,
      stars: p.stars ?? 0,
      helpedCount: p.helpedCount ?? 0,
      exportCount: p.exportCount ?? 0,
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
