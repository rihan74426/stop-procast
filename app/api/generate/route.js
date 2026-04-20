import Anthropic from "@anthropic-ai/sdk";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  buildClarifyPrompt,
} from "@/lib/ai/prompts";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function main() {
  const chatCompletion = await getGroqChatCompletion();
  // Print the completion returned by the LLM.
  console.log(chatCompletion.choices[0]?.message?.content || "");
}

export async function getGroqChatCompletion() {
  return groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: "Explain the importance of fast language models",
      },
    ],
    model: "openai/gpt-oss-20b",
  });
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export async function POST(request) {
  try {
    const body = await request.json();
    const { type, idea, clarifications, scopeLevel } = body;

    // ─── Clarifying questions (non-streaming) ───────────────────────
    if (type === "clarify") {
      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: buildClarifyPrompt(idea) }],
      });
      const text = msg.content.find((b) => b.type === "text")?.text ?? "[]";
      return Response.json({ questions: text });
    }

    // ─── Project generation (streaming) ────────────────────────────
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

    // Pipe the stream back to the client
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
  } catch (err) {
    console.error("Generate API error:", err);
    return Response.json(
      { error: err.message ?? "Generation failed" },
      { status: 500 }
    );
  }
}
