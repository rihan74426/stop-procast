import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  buildClarifyPrompt,
  buildReengagePrompt,
} from "@/lib/ai/prompts";
import { aiGenerate, aiStream } from "@/lib/ai/client";

// ─── Rate limiter ──────────────────────────────────────────────────────
// Per-IP, sliding window. Resets on cold-start — intentional for serverless.
// Generous limits: blueprint generation is the main use case.
const ipUsage = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10; // increased from 5 — new users need headroom
const MAX_GENERATE_PER_WINDOW = 3; // separate stricter limit for blueprint generation

function checkRateLimit(ip, type) {
  const now = Date.now();
  let entry = ipUsage.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    entry = { total: 0, generate: 0, windowStart: now };
    ipUsage.set(ip, entry);
  }

  // Prune stale entries to prevent memory growth
  if (ipUsage.size > 500) {
    for (const [k, v] of ipUsage) {
      if (now - v.windowStart > WINDOW_MS * 3) ipUsage.delete(k);
    }
  }

  const totalOk = entry.total < MAX_PER_WINDOW;
  const generateOk =
    type !== "generate" || entry.generate < MAX_GENERATE_PER_WINDOW;

  if (totalOk && generateOk) {
    entry.total++;
    if (type === "generate") entry.generate++;
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

// ─── Route timeout wrapper ────────────────────────────────────────────
const ROUTE_TIMEOUT_MS = 55_000; // stay under Vercel's 60s limit

function withRouteTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            Object.assign(new Error("Request timed out"), { status: 504 })
          ),
        ROUTE_TIMEOUT_MS
      )
    ),
  ]);
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

    if (!type) {
      return Response.json({ error: "Missing type field." }, { status: 400 });
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

    // ── clarify ────────────────────────────────────────────────────────
    if (type === "clarify") {
      if (!idea?.trim()) {
        return Response.json({ error: "Missing idea." }, { status: 400 });
      }
      // Returns raw text string — client parser handles JSON extraction
      const text = await withRouteTimeout(aiGenerate(buildClarifyPrompt(idea)));
      return Response.json({ questions: text });
    }

    // ── reengage ───────────────────────────────────────────────────────
    if (type === "reengage") {
      if (!project) {
        return Response.json({ error: "Missing project." }, { status: 400 });
      }
      const text = await withRouteTimeout(
        aiGenerate(buildReengagePrompt(project))
      );
      return Response.json({ suggestion: text });
    }

    // ── generate (streaming blueprint) ────────────────────────────────
    if (type === "generate") {
      if (!idea?.trim()) {
        return Response.json({ error: "Missing idea." }, { status: 400 });
      }

      const userPrompt = buildUserPrompt({
        idea,
        clarifications: Array.isArray(clarifications) ? clarifications : [],
        scopeLevel: scopeLevel || "standard",
        profileContext:
          typeof profileContext === "string" ? profileContext : "",
      });

      const stream = await withRouteTimeout(
        aiStream(SYSTEM_PROMPT, userPrompt)
      );
      return new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return Response.json({ error: `Unknown type: ${type}` }, { status: 400 });
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
