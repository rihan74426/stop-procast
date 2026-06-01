/**
 * lib/ai/publicize.js
 *
 * AI-based project quality scoring and categorization.
 * Used by:
 *   - app/api/projects/[id]/publicize/route.js  (POST to score + publish)
 *   - app/explore/page.jsx                       (imports CATEGORIES)
 *   - components/completion/PublicizePanel.jsx   (imports CATEGORIES)
 */

import { aiGenerate } from "@/lib/ai/client";
import { v4 as uuid } from "uuid";

// ─── Category list ────────────────────────────────────────────────────
// Keep in sync with any UI that renders these as filter chips.

export const CATEGORIES = [
  "Software & Tech",
  "Business & Startup",
  "Learning & Education",
  "Creative & Design",
  "Health & Fitness",
  "Research & Analysis",
  "Personal Development",
  "Marketing & Growth",
  "Finance & Investment",
  "Career & Professional",
  "Home & Lifestyle",
  "Other",
];

// Projects must score >= this to be listed publicly after AI evaluation.
// Lower values = more projects shown; raise to tighten quality gate.
export const PUBLIC_QUALITY_THRESHOLD = 72;

// ─── Slug builder ─────────────────────────────────────────────────────

function buildPublicSlug(title) {
  const base = (title || "project")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const suffix = uuid().slice(0, 6);
  return `${base}-${suffix}`;
}

// ─── AI scoring ───────────────────────────────────────────────────────

/**
 * scoreAndCategorize(project)
 *
 * Sends the project summary to the AI and returns:
 *   { score, reason, category, tags, publicSlug }
 *
 * score     0–100  quality rating
 * reason    string short explanation of the score
 * category  string one of CATEGORIES
 * tags      string[] up to 5 lowercase tags
 * publicSlug string  URL-safe slug for the project
 */
export async function scoreAndCategorize(project) {
  const phaseSummary = (project.phases ?? [])
    .slice(0, 4)
    .map((p) => p.name)
    .join(", ");

  const taskCount = project.tasks?.length ?? 0;
  const doneCount = (project.tasks ?? []).filter(
    (t) => t.status === "done"
  ).length;

  const lines = [
    `Title: ${project.projectTitle || "(none)"}`,
    `Goal: ${project.oneLineGoal || "(none)"}`,
    project.problemStatement
      ? `Problem: ${project.problemStatement.slice(0, 200)}`
      : null,
    phaseSummary ? `Phases: ${phaseSummary}` : null,
    `Tasks: ${taskCount} total, ${doneCount} done`,
    project.completionDate ? "Status: Completed" : "Status: In progress",
    project.successCriteria?.length
      ? `Success criteria: ${project.successCriteria.slice(0, 2).join("; ")}`
      : null,
    project.estimatedEffort ? `Effort: ${project.estimatedEffort}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are evaluating a project plan for public quality. Score 0-100.

PROJECT:
${lines}

AVAILABLE CATEGORIES: ${CATEGORIES.join(", ")}

Scoring rubric:
- Clear, specific title and goal          (0-25 pts)
- Well-structured plan: phases and tasks  (0-25 pts)
- Concrete and actionable content         (0-25 pts)
- Completion or strong progress           (0-25 pts)

Respond with ONLY valid JSON — no markdown, no explanation outside the JSON:
{
  "score": <integer 0-100>,
  "reason": "<one concise sentence>",
  "category": "<exactly one from the list above>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"]
}`;

  try {
    const raw = await aiGenerate(prompt);
    // Strip any accidental markdown fences the model might add
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      score: Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 0))),
      reason: String(parsed.reason ?? "").slice(0, 200),
      category: CATEGORIES.includes(parsed.category)
        ? parsed.category
        : "Other",
      tags: Array.isArray(parsed.tags)
        ? parsed.tags
            .slice(0, 5)
            .map((t) =>
              String(t)
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "")
                .slice(0, 30)
            )
            .filter(Boolean)
        : [],
      publicSlug: buildPublicSlug(project.projectTitle),
    };
  } catch (err) {
    console.error("[publicize] AI scoring failed:", err.message);
    // Graceful fallback — still returns a slug so the project can be saved
    return {
      score: 0,
      reason: "Scoring unavailable — will retry.",
      category: "Other",
      tags: [],
      publicSlug: buildPublicSlug(project.projectTitle),
    };
  }
}
