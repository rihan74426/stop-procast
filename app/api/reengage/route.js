import { aiGenerate } from "@/lib/ai/client";
import { buildReengagePrompt } from "@/lib/ai/prompts";

export async function POST(request) {
  try {
    const { project, locale = "en" } = await request.json();
    if (!project)
      return Response.json({ error: "Missing project" }, { status: 400 });
    const text = await aiGenerate(buildReengagePrompt(project, locale));
    return Response.json({ suggestion: text });
  } catch (err) {
    console.error("[reengage] error:", err.message);
    return Response.json({ suggestion: null });
  }
}
