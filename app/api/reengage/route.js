import Anthropic from "@anthropic-ai/sdk";
import { buildReengagePrompt } from "@/lib/ai/prompts";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { project } = await request.json();
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 150,
      messages: [{ role: "user", content: buildReengagePrompt(project) }],
    });
    const text = msg.content.find((b) => b.type === "text")?.text ?? "";
    return Response.json({ suggestion: text });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
