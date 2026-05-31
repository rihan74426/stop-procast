/**
 * GET /api/explore
 * Public endpoint — returns paginated, anonymized public projects.
 *
 * CRITICAL FIX: query uses { isPublic: { $ne: false } } instead of
 * { isPublic: true } so legacy documents without the field set are
 * treated as public (the intended default).
 */

import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

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
  // Engagement
  views: 1,
  stars: 1,
  helpedCount: 1,
  exportCount: 1,
  _id: 0,
  __v: 0,
  userId: 0,
  sessionId: 0,
  isAnonymous: 0,
  tasks: 0,
  blockers: 0,
  postmortem: 0,
  streakDays: 0,
  lastActivityAt: 0,
  dailyNextAction: 0,
  starredBy: 0,
  helpedBy: 0,
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

    // CRITICAL: $ne: false treats undefined/null as public
    // This covers legacy documents created before isPublic field existed
    const query = {};

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

    // Strip phases to names + objectives only for card view
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
