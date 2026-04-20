import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  buildClarifyPrompt,
  buildReengagePrompt,
} from "@/lib/ai/prompts";
import { openrouterGenerate, openrouterStream } from "@/lib/ai/openrouter";

// Switch via .env.local: AI_PROVIDER=openrouter | anthropic
const PROVIDER = process.env.AI_PROVIDER ?? "openrouter";

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, idea, clarifications, scopeLevel, project } = body;

    if (PROVIDER === "anthropic") {
      return handleAnthropic(type, {
        idea,
        clarifications,
        scopeLevel,
        project,
      });
    }

    return handleOpenRouter(type, {
      idea,
      clarifications,
      scopeLevel,
      project,
    });
  } catch (err) {
    console.error("[generate] error:", err);
    return Response.json(
      { error: err.message ?? "Generation failed" },
      { status: 500 }
    );
  }
}

// ─── OpenRouter handler ───────────────────────────────────────────────────────

async function handleOpenRouter(
  type,
  { idea, clarifications, scopeLevel, project }
) {
  // 1. Clarify — returns JSON array of 3 questions
  if (type === "clarify") {
    const text = await openrouterGenerate(null, buildClarifyPrompt(idea));
    return Response.json({ questions: text });
  }

  // 2. Re-engage — returns a short motivational action sentence
  if (type === "reengage") {
    const text = await openrouterGenerate(null, buildReengagePrompt(project));
    return Response.json({ suggestion: text });
  }

  // 3. Generate — streams the full project blueprint JSON
  const stream = await openrouterStream(
    SYSTEM_PROMPT,
    buildUserPrompt({ idea, clarifications, scopeLevel })
  );

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// ─── Anthropic handler (kept for commercial tier) ─────────────────────────────

async function handleAnthropic(
  type,
  { idea, clarifications, scopeLevel, project }
) {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  if (type === "clarify") {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: buildClarifyPrompt(idea) }],
    });
    const text = msg.content.find((b) => b.type === "text")?.text ?? "[]";
    return Response.json({ questions: text });
  }

  if (type === "reengage") {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 150,
      messages: [{ role: "user", content: buildReengagePrompt(project) }],
    });
    const text = msg.content.find((b) => b.type === "text")?.text ?? "";
    return Response.json({ suggestion: text });
  }

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt({ idea, clarifications, scopeLevel }),
      },
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
