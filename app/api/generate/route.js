import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  buildClarifyPrompt,
  buildReengagePrompt,
} from "@/lib/ai/prompts";
import { aiGenerate, aiStream } from "@/lib/ai/client";

// Simple in-memory rate limiter (per IP, resets on server restart)
// For production, replace with Redis or similar
const ipUsage = new Map();
const WINDOW_MS = 60_000; // 1 minute
const MAX_PER_MINUTE = 3; // max 3 AI requests per IP per minute

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = ipUsage.get(ip) ?? { count: 0, windowStart: now };

  // Reset window if expired
  if (now - entry.windowStart > WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count++;
  ipUsage.set(ip, entry);

  // Clean up old entries every 100 requests
  if (ipUsage.size > 500) {
    for (const [k, v] of ipUsage) {
      if (now - v.windowStart > WINDOW_MS * 5) ipUsage.delete(k);
    }
  }

  return entry.count <= MAX_PER_MINUTE;
}

function getClientIP(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request) {
  try {
    const ip = getClientIP(request);

    if (!checkRateLimit(ip)) {
      return Response.json(
        {
          error: "Too many requests. Please wait a moment before trying again.",
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { type, idea, clarifications, scopeLevel, project, profileContext } =
      body;

    if (!type) {
      return Response.json(
        { error: "Missing type field.", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    if (type === "clarify") {
      const text = await aiGenerate(buildClarifyPrompt(idea));
      return Response.json({ questions: text });
    }

    if (type === "reengage") {
      const text = await aiGenerate(buildReengagePrompt(project));
      return Response.json({ suggestion: text });
    }

    if (type === "generate") {
      const userPrompt = buildUserPrompt({
        idea,
        clarifications,
        scopeLevel,
        profileContext:
          typeof profileContext === "string" ? profileContext : "",
      });
      const stream = await aiStream(SYSTEM_PROMPT, userPrompt);
      return new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return Response.json(
      { error: `Unknown type: ${type}`, code: "BAD_REQUEST" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[generate] error:", err.message);

    const status = err.status ?? 500;
    const code =
      status === 429
        ? "RATE_LIMITED"
        : status === 402
        ? "QUOTA_EXCEEDED"
        : "AI_ERROR";
    const message =
      status === 429
        ? "AI rate limit reached. Please wait 30 seconds and try again."
        : status === 402
        ? "AI quota exceeded for today. Please try again tomorrow."
        : "Plan generation failed. Please try again.";

    return Response.json({ error: message, code }, { status });
  }
}
