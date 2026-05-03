// Server-only AI client — uses OpenRouter free tier
// Only called when puter.js fails or for ambitious scope

const API_BASE = "https://openrouter.ai/api/v1";

// Free model fallback chain — ordered by quality
const FREE_MODELS = [
  process.env.OPENROUTER_MODEL, // env override (e.g. z-ai/glm-4.5-air:free)
  "meta-llama/llama-3.2-3b-instruct:free",
  "google/gemma-3n-e4b-it:free",
  process.env.OPENROUTER_MODEL1, // secondary env override
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
].filter(Boolean); // remove undefined env vars

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "Momentum",
    // Cache repeated prompts (clarify/reengage are templated — free cache hits)
    "X-OpenRouter-Cache": "true",
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchModel(model, body) {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ ...body, model }),
  });
  return res;
}

/**
 * Try each free model in order until one succeeds.
 * Returns the raw Response object.
 */
async function fetchWithModelFallback(body, { stream = false } = {}) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(
      "AI service not configured. Add OPENROUTER_API_KEY to .env.local"
    );
  }

  let lastStatus = 0;

  for (let i = 0; i < FREE_MODELS.length; i++) {
    const model = FREE_MODELS[i];
    if (!model) continue;

    try {
      const res = await fetchModel(model, body);

      if (res.status === 429) {
        // Rate limited — wait and try next model
        lastStatus = 429;
        if (i < FREE_MODELS.length - 1) await sleep(1500);
        continue;
      }
      if (res.status === 402) {
        // Quota — try next model
        lastStatus = 402;
        continue;
      }
      if (!res.ok) {
        lastStatus = res.status;
        continue;
      }

      return res;
    } catch {
      // Network error — try next
      continue;
    }
  }

  const err = new Error(
    lastStatus === 429
      ? "Rate limit reached on all models. Wait a minute and retry."
      : lastStatus === 402
      ? "AI quota exceeded. Try again tomorrow or add OPENROUTER_API_KEY."
      : "AI request failed. Check your OPENROUTER_API_KEY."
  );
  err.status = lastStatus || 500;
  throw err;
}

/**
 * Non-streaming: clarify questions, re-engage prompts.
 */
export async function aiGenerate(
  userPrompt,
  _modelId = null,
  systemPrompt = null
) {
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const res = await fetchWithModelFallback({
    max_tokens: 400,
    messages,
    temperature: 0.7,
  });
  const data = await res.json();

  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("AI returned empty response");
  return text;
}

/**
 * Streaming: blueprint generation only.
 */
export async function aiStream(systemPrompt, userPrompt, _modelId = null) {
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const res = await fetchWithModelFallback(
    { max_tokens: 2500, stream: true, temperature: 0.7, messages },
    { stream: true }
  );

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = res.body.getReader();
      let buffer = "";
      try {
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
              /* skip malformed */
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}
