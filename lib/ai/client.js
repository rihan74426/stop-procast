// Server-only AI client wrapper
// Provider details are intentionally abstracted — not exposed in UI

const API_BASE = "https://openrouter.ai/api/v1";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "Momentum",
  };
}

// Map model slot IDs to env vars
const MODEL_MAP = {
  model1: () => process.env.OPENROUTER_MODEL,
  model2: () => process.env.OPENROUTER_MODEL2,
  model3: () => process.env.OPENROUTER_MODEL3,
};

function resolveModel(modelId) {
  if (modelId && MODEL_MAP[modelId]) {
    const m = MODEL_MAP[modelId]();
    if (m) return m;
  }
  // Fallback chain: try each slot
  return (
    process.env.OPENROUTER_MODEL ||
    process.env.OPENROUTER_MODEL2 ||
    process.env.OPENROUTER_MODEL3 ||
    "deepseek/deepseek-chat-v3-0324:free"
  );
}

/**
 * Non-streaming completion (clarify questions, re-engage prompts)
 */
export async function aiGenerate(userPrompt, modelId, systemPrompt = null) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("AI service is not configured. Contact support.");
  }

  const model = resolveModel(modelId);
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ model, max_tokens: 600, messages }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI service error (${res.status})`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Streaming completion (blueprint generation)
 */
export async function aiStream(systemPrompt, userPrompt, modelId) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("AI service is not configured. Contact support.");
  }

  const model = resolveModel(modelId);
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ model, max_tokens: 4000, stream: true, messages }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI service error (${res.status})`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = res.body.getReader();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {
            // skip malformed chunks
          }
        }
      }
      controller.close();
    },
  });
}
