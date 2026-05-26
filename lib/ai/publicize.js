/**
 * lib/ai/publicize.js — Server-side AI calls for:
 * 1. Quality scoring a completed project (0–100)
 * 2. Auto-categorizing a project + extracting keyword tags
 *
 * Called from the POST /api/projects/publicize route after a
 * project is marked complete AND the user opts into public sharing.
 */

import { aiGenerate } from "./client";

// ─── Category taxonomy ────────────────────────────────────────────────
// Fixed top-level categories shown in /explore filters.
// AI may only assign one of these — freeform input maps to nearest.

export const CATEGORIES = [
  "Software & Apps",
  "Learning & Education",
  "Business & Startup",
  "Health & Fitness",
  "Creative & Art",
  "Content & Writing",
  "Finance & Career",
  "Home & Life",
  "Research & Science",
  "Social Impact",
  "Other",
];

// ─── Quality scoring prompt ───────────────────────────────────────────

function buildQualityPrompt(project) {
  const doneTasks =
    project.tasks?.filter((t) => t.status === "done").length ?? 0;
  const totalTasks = project.tasks?.length ?? 0;
  const completionRate =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const hasPostmortem =
    project.postmortem?.answers?.filter((a) => a.answer?.trim()).length > 0;
  const phaseCount = project.phases?.length ?? 0;
  const milestoneCount = project.phases?.reduce(
    (acc, p) => acc + (p.milestones?.length ?? 0),
    0
  );

  return `You are a quality reviewer for a project planning app. Score this completed project from 0 to 100.

Project title: ${project.projectTitle}
Goal: ${project.oneLineGoal}
Scope: ${project.scopeLevel}
Phases: ${phaseCount}, Milestones: ${milestoneCount}, Tasks: ${totalTasks}
Task completion: ${completionRate}%
Has retrospective answers: ${hasPostmortem}
Problem statement length: ${project.problemStatement?.length ?? 0} chars
Success criteria count: ${project.successCriteria?.length ?? 0}

Scoring criteria:
- Title is specific and outcome-focused (not generic like "my project"): 0–20 pts
- Goal is concrete and measurable: 0–20 pts
- Plan has meaningful structure (phases, milestones, tasks): 0–20 pts
- Task completion is meaningful (≥50% done): 0–20 pts
- Project has real depth (problem statement, success criteria, retro): 0–20 pts

DEDUCT points heavily for:
- Placeholder or test content ("test", "asdf", "example project")
- No real tasks or empty phases
- Single-word or nonsensical titles
- Completion rate under 30%

Respond with ONLY a JSON object, no other text:
{"score": <integer 0-100>, "reason": "<one sentence>"}`;
}

// ─── Category + tags prompt ───────────────────────────────────────────

function buildCategoryPrompt(project) {
  return `Categorize this project for a public gallery and extract keyword tags.

Project: "${project.projectTitle}"
Goal: ${project.oneLineGoal}
Problem: ${project.problemStatement ?? ""}
Scope: ${project.scopeLevel}

Available categories (pick exactly ONE):
${CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Rules for tags:
- 3 to 5 lowercase tags, hyphenated if multi-word (e.g. "machine-learning", "weight-loss")
- Tags describe the DOMAIN, not the scope or effort level
- Be specific: "python" not "coding"; "meditation" not "wellness"
- No tags that repeat the category name

Respond with ONLY a JSON object, no other text:
{"category": "<category from list>", "tags": ["tag1", "tag2", "tag3"]}`;
}

// ─── Public slug generator ────────────────────────────────────────────

export function generatePublicSlug(title) {
  const base = (title || "project")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

// ─── Main export: score + categorize ─────────────────────────────────

/**
 * Runs both quality check and categorization in parallel.
 * Returns { score, reason, category, tags, publicSlug } or throws.
 */
export async function scoreAndCategorize(project) {
  const [qualityRaw, categoryRaw] = await Promise.allSettled([
    aiGenerate(buildQualityPrompt(project)),
    aiGenerate(buildCategoryPrompt(project)),
  ]);

  // Parse quality score
  let score = 0;
  let reason = "";
  if (qualityRaw.status === "fulfilled") {
    try {
      const clean = qualityRaw.value.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      score = Math.max(0, Math.min(100, parseInt(parsed.score) || 0));
      reason = parsed.reason || "";
    } catch {
      score = 0;
    }
  }

  // Parse category + tags
  let category = "Other";
  let tags = [];
  if (categoryRaw.status === "fulfilled") {
    try {
      const clean = categoryRaw.value.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      category = CATEGORIES.includes(parsed.category)
        ? parsed.category
        : "Other";
      tags = Array.isArray(parsed.tags)
        ? parsed.tags
            .slice(0, 5)
            .map((t) => String(t).toLowerCase().slice(0, 32))
        : [];
    } catch {
      category = "Other";
    }
  }

  const publicSlug = generatePublicSlug(project.projectTitle);

  return { score, reason, category, tags, publicSlug };
}

// Quality threshold — must meet this to be publicly listed
export const PUBLIC_QUALITY_THRESHOLD = 72;
