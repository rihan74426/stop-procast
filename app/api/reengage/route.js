import { openrouterGenerate } from "@/lib/ai/openrouter";
import { buildReengagePrompt } from "@/lib/ai/prompts";

export async function POST(request) {
  try {
    const { project } = await request.json();
    if (!project) {
      return Response.json({ error: "Missing project" }, { status: 400 });
    }
    const text = await openrouterGenerate(null, buildReengagePrompt(project));
    return Response.json({ suggestion: text });
  } catch (err) {
    console.error("[reengage] error:", err);
    return Response.json({ suggestion: null }, { status: 500 });
  }
}
