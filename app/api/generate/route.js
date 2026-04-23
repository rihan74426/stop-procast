import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  buildClarifyPrompt,
  buildReengagePrompt,
} from "@/lib/ai/prompts";
import { aiGenerate, aiStream } from "@/lib/ai/client";

export async function POST(request) {
  try {
    const body = await request.json();
    // NOTE: profileContext is a plain pre-built string from the client.
    // We NEVER import client-only modules (loadUserProfile, buildProfileContext) here.
    const {
      type,
      idea,
      clarifications,
      scopeLevel,
      project,
      modelId,
      profileContext,
    } = body;

    if (!type) {
      return Response.json({ error: "Missing 'type' field" }, { status: 400 });
    }

    if (type === "clarify") {
      const text = await aiGenerate(buildClarifyPrompt(idea), modelId);
      return Response.json({ questions: text });
    }

    if (type === "reengage") {
      const text = await aiGenerate(buildReengagePrompt(project), modelId);
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
      const stream = await aiStream(SYSTEM_PROMPT, userPrompt, modelId);
      return new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return Response.json({ error: `Unknown type: ${type}` }, { status: 400 });
  } catch (err) {
    console.error("[generate] error:", err.message);
    return Response.json({ error: "Generation failed." }, { status: 500 });
  }
}
