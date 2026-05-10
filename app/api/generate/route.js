/**
 * app/api/generate/route.js
 *
 * Rate limiter note:
 *   The ipUsage Map lives in module scope. On Vercel (serverless), every
 *   cold start creates a fresh Map — a user can technically exceed the
 *   per-minute limit by hitting different function instances. This is
 *   acceptable for MVP (the server-side limit is a supplement to the
 *   client-side rateLimit.js guard). For hard enforcement at scale, move
 *   to Redis/Upstash. Until then: x-ratelimit-* headers are returned so
 *   clients can self-throttle even when the Map resets.
 */

import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  buildClarifyPrompt,
  buildReengagePrompt,
} from "@/lib/ai/prompts";
import { aiGenerate, aiStream } from "@/lib/ai/client";

// ─── Rate limiter (in-memory, per cold-start instance) ────────────────

const ipUsage = new Map();
const WINDOW_MS = 60_000;

const LIMITS = {
  generate: 3,
  clarify: 10,
  reengage: 20,
  total: 15,
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

  // Prune stale entries to prevent memory growth on long-lived instances
  if (ipUsage.size > 1000) {
    for (const [k, v] of ipUsage) {
      if (now - v.windowStart > WINDOW_MS * 5) ipUsage.delete(k);
    }
  }

  const typeLimit = LIMITS[type] ?? 10;
  const typeOk = (entry[type] ?? 0) < typeLimit;
  const totalOk = entry.total < LIMITS.total;

  if (typeOk && totalOk) {
    entry[type] = (entry[type] ?? 0) + 1;
    entry.total++;
    return {
      allowed: true,
      remaining: typeLimit - entry[type],
      reset: Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000),
    };
  }

  const retryAfter = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
  return { allowed: false, retryAfter, remaining: 0, reset: retryAfter };
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

    const rl = checkRateLimit(ip, type);

    // Always include rate-limit info in response headers so clients can
    // self-throttle even when cold starts reset the in-memory counter.
    const rlHeaders = {
      "X-RateLimit-Limit": String(LIMITS[type] ?? 10),
      "X-RateLimit-Remaining": String(rl.remaining),
      "X-RateLimit-Reset": String(rl.reset ?? 60),
    };

    if (!rl.allowed) {
      return Response.json(
        {
          error: `Too many requests. Please wait ${rl.retryAfter}s and retry.`,
          code: "RATE_LIMITED",
          retryAfter: rl.retryAfter,
        },
        {
          status: 429,
          headers: { ...rlHeaders, "Retry-After": String(rl.retryAfter) },
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
      return Response.json({ questions: text }, { headers: rlHeaders });
    }

    // ── reengage ─────────────────────────────────────────────────────
    if (type === "reengage") {
      if (!project || typeof project !== "object") {
        return Response.json({ error: "Missing project." }, { status: 400 });
      }
      const text = await withRouteTimeout(
        aiGenerate(buildReengagePrompt(project))
      );
      return Response.json({ suggestion: text }, { headers: rlHeaders });
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
          ...rlHeaders,
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
