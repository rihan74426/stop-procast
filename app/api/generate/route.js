import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  buildClarifyPrompt,
  buildReengagePrompt,
} from "@/lib/ai/prompts";
import { aiGenerate, aiStream } from "@/lib/ai/client";

// In-memory rate limiter (per IP) — resets on server restart
// For production: replace with Redis/Upstash
const ipUsage = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_MINUTE = 5; // slightly more generous than before

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = ipUsage.get(ip) ?? { count: 0, windowStart: now };
  if (now - entry.windowStart > WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count++;
  ipUsage.set(ip, entry);

  // Cleanup stale entries
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
        { error: "Too many requests. Wait a moment.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { type, idea, clarifications, scopeLevel, project, profileContext } =
      body;

    if (!type) {
      return Response.json({ error: "Missing type." }, { status: 400 });
    }

    if (type === "clarify") {
      if (!idea)
        return Response.json({ error: "Missing idea." }, { status: 400 });
      const text = await aiGenerate(buildClarifyPrompt(idea));
      return Response.json({ questions: text });
    }

    if (type === "reengage") {
      if (!project)
        return Response.json({ error: "Missing project." }, { status: 400 });
      const text = await aiGenerate(buildReengagePrompt(project));
      return Response.json({ suggestion: text });
    }

    if (type === "generate") {
      if (!idea)
        return Response.json({ error: "Missing idea." }, { status: 400 });
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

    return Response.json({ error: `Unknown type: ${type}` }, { status: 400 });
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
        ? "Rate limit reached. Wait 30s and retry."
        : status === 402
        ? "AI quota exceeded. Try again tomorrow."
        : "Plan generation failed. Please try again.";
    return Response.json({ error: message, code }, { status });
  }
}
