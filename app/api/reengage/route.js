import { aiGenerate } from "@/lib/ai/client";
import { buildReengagePrompt } from "@/lib/ai/prompts";

export async function POST(request) {
  try {
    const { project } = await request.json();
    if (!project)
      return Response.json({ error: "Missing project" }, { status: 400 });

    const text = await aiGenerate(buildReengagePrompt(project));
    return Response.json({ suggestion: text });
  } catch (err) {
    console.error("[reengage] error:", err.message);
    // Return null suggestion — UI handles this gracefully
    return Response.json({ suggestion: null });
  }
}
