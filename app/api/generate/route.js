import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  buildClarifyPrompt,
  buildReengagePrompt,
} from "@/lib/ai/prompts";
import { aiGenerate, aiStream } from "@/lib/ai/client";

// Per-IP rate limiter (resets on server restart — use Redis in production)
const ipUsage = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_MINUTE = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = ipUsage.get(ip) ?? { count: 0, windowStart: now };
  if (now - entry.windowStart > WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count++;
  ipUsage.set(ip, entry);

  // Prune stale entries periodically (memory safety)
  if (ipUsage.size > 1000) {
    for (const [k, v] of ipUsage) {
      if (now - v.windowStart > WINDOW_MS * 5) ipUsage.delete(k);
    }
  }
  return entry.count <= MAX_PER_MINUTE;
}

function getRetryAfter(ip) {
  const entry = ipUsage.get(ip);
  if (!entry) return 60;
  return Math.ceil((entry.windowStart + WINDOW_MS - Date.now()) / 1000);
}

function getIP(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request) {
  try {
    const ip = getIP(request);
    if (!checkRateLimit(ip)) {
      const retryAfter = getRetryAfter(ip);
      return Response.json(
        {
          error: `Too many requests. Wait ${retryAfter}s and retry.`,
          code: "RATE_LIMITED",
          retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { type, idea, clarifications, scopeLevel, project, profileContext } =
      body;

    if (!type) {
      return Response.json({ error: "Missing type." }, { status: 400 });
    }

    // clarify — fallback (puter handles first)
    if (type === "clarify") {
      if (!idea?.trim()) {
        return Response.json({ error: "Missing idea." }, { status: 400 });
      }
      const text = await aiGenerate(buildClarifyPrompt(idea));
      return Response.json({ questions: text });
    }

    // reengage — fallback
    if (type === "reengage") {
      if (!project) {
        return Response.json({ error: "Missing project." }, { status: 400 });
      }
      const text = await aiGenerate(buildReengagePrompt(project));
      return Response.json({ suggestion: text });
    }

    // generate — ambitious/deep mode or puter fallback
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
      const stream = await aiStream(SYSTEM_PROMPT, userPrompt);
      return new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return Response.json({ error: `Unknown type: ${type}` }, { status: 400 });
  } catch (err) {
    console.error("[generate]", err.message);
    const status = err.status ?? 500;
    const code =
      status === 429
        ? "RATE_LIMITED"
        : status === 402
        ? "QUOTA_EXCEEDED"
        : "AI_ERROR";
    const message =
      status === 429
        ? "Rate limit hit. Wait a moment and retry."
        : status === 402
        ? "AI quota exceeded. Try again tomorrow."
        : "Generation failed. Please try again.";
    return Response.json({ error: message, code }, { status });
  }
}
