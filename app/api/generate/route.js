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
  if (ipUsage.size > 500) {
    for (const [k, v] of ipUsage) {
      if (now - v.windowStart > WINDOW_MS * 5) ipUsage.delete(k);
    }
  }
  return entry.count <= MAX_PER_MINUTE;
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
      return Response.json(
        { error: "Too many requests. Wait a moment.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { type, idea, clarifications, scopeLevel, project, profileContext } =
      body;

    if (!type)
      return Response.json({ error: "Missing type." }, { status: 400 });

    // clarify & reengage — fallback only (puter handles these client-side first)
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

    // generate — called for ambitious/deep mode OR when puter fails
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
        ? "Rate limit hit. Wait 30s and retry."
        : status === 402
        ? "AI quota exceeded. Try again tomorrow."
        : "Generation failed. Please try again.";
    return Response.json({ error: message, code }, { status });
  }
}
