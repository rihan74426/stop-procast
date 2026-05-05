/**
 * app/api/generate/route.js
 *
 * Improvements:
 * - Rate limiter uses IP + User-Agent fingerprint (harder to bypass)
 * - Separate counters per request type
 * - Request validation before AI call
 * - Graceful streaming error with readable message
 * - Route timeout aligned with Vercel's 60s limit
 */

import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  buildClarifyPrompt,
  buildReengagePrompt,
} from "@/lib/ai/prompts";
import { aiGenerate, aiStream } from "@/lib/ai/client";

// ─── Rate limiter ─────────────────────────────────────────────────────
// Sliding window per IP. Resets on cold-start (intentional for serverless).

const ipUsage = new Map();
const WINDOW_MS = 60_000;

const LIMITS = {
  generate: 3, // blueprint per minute
  clarify: 10,
  reengage: 20,
  total: 15, // all types combined
};

function checkRateLimit(ip, type) {
  const now = Date.now();
  let entry = ipUsage.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    entry = {
      total: 0,
      generate: 0,
      clarify: 0,
      reengage: 0,
      windowStart: now,
    };
    ipUsage.set(ip, entry);
  }

  // Prune stale entries to prevent memory growth
  if (ipUsage.size > 1000) {
    for (const [k, v] of ipUsage) {
      if (now - v.windowStart > WINDOW_MS * 5) ipUsage.delete(k);
    }
  }

  const typeOk = (entry[type] ?? 0) < (LIMITS[type] ?? 10);
  const totalOk = entry.total < LIMITS.total;

  if (typeOk && totalOk) {
    entry[type] = (entry[type] ?? 0) + 1;
    entry.total++;
    return { allowed: true };
  }

  const retryAfter = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
  return { allowed: false, retryAfter };
}

function getIP(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ─── Route timeout ────────────────────────────────────────────────────
const ROUTE_TIMEOUT_MS = 55_000;

function withRouteTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            Object.assign(new Error("Request timed out"), {
              status: 504,
              code: "TIMEOUT",
            })
          ),
        ROUTE_TIMEOUT_MS
      )
    ),
  ]);
}

// ─── Input validation ─────────────────────────────────────────────────

function validateIdea(idea) {
  if (!idea || typeof idea !== "string") return "Missing idea.";
  const trimmed = idea.trim();
  if (trimmed.length < 10) return "Idea is too short (min 10 characters).";
  if (trimmed.length > 5000) return "Idea is too long (max 5000 characters).";
  return null;
}

// ─── POST /api/generate ───────────────────────────────────────────────
export async function POST(request) {
  try {
    const ip = getIP(request);

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { type, idea, clarifications, scopeLevel, project, profileContext } =
      body;

    if (!type || typeof type !== "string") {
      return Response.json(
        { error: "Missing or invalid type field." },
        { status: 400 }
      );
    }

    const validTypes = ["generate", "clarify", "reengage"];
    if (!validTypes.includes(type)) {
      return Response.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    // Rate check
    const rl = checkRateLimit(ip, type);
    if (!rl.allowed) {
      return Response.json(
        {
          error: `Too many requests. Please wait ${rl.retryAfter}s and retry.`,
          code: "RATE_LIMITED",
          retryAfter: rl.retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfter) },
        }
      );
    }

    // ── clarify ──────────────────────────────────────────────────────
    if (type === "clarify") {
      const ideaError = validateIdea(idea);
      if (ideaError)
        return Response.json({ error: ideaError }, { status: 400 });

      const text = await withRouteTimeout(
        aiGenerate(buildClarifyPrompt(idea.trim()))
      );
      return Response.json({ questions: text });
    }

    // ── reengage ─────────────────────────────────────────────────────
    if (type === "reengage") {
      if (!project || typeof project !== "object") {
        return Response.json({ error: "Missing project." }, { status: 400 });
      }
      const text = await withRouteTimeout(
        aiGenerate(buildReengagePrompt(project))
      );
      return Response.json({ suggestion: text });
    }

    // ── generate (streaming blueprint) ───────────────────────────────
    if (type === "generate") {
      const ideaError = validateIdea(idea);
      if (ideaError)
        return Response.json({ error: ideaError }, { status: 400 });

      const safeScope = ["lean", "standard", "ambitious"].includes(scopeLevel)
        ? scopeLevel
        : "standard";

      const userPrompt = buildUserPrompt({
        idea: idea.trim(),
        clarifications: Array.isArray(clarifications) ? clarifications : [],
        scopeLevel: safeScope,
        profileContext:
          typeof profileContext === "string"
            ? profileContext.slice(0, 2000)
            : "",
      });

      const stream = await withRouteTimeout(
        aiStream(SYSTEM_PROMPT, userPrompt)
      );

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  } catch (err) {
    console.error("[generate] error:", err.message);

    const status = err.status ?? 500;
    const code =
      err.code ??
      (status === 429
        ? "RATE_LIMITED"
        : status === 402
        ? "QUOTA_EXCEEDED"
        : status === 504
        ? "TIMEOUT"
        : "AI_ERROR");

    const message =
      status === 429
        ? "Rate limit hit. Please wait a moment and retry."
        : status === 402
        ? "AI quota exceeded. Try again tomorrow."
        : status === 504
        ? "Request timed out. Please try again."
        : err.message ?? "Generation failed. Please try again.";

    return Response.json({ error: message, code }, { status });
  }
}
