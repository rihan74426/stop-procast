// Server-only AI client — uses OpenRouter free tier
// Only called when puter.js fails or for ambitious scope

const API_BASE = "https://openrouter.ai/api/v1";
const MODEL_TIMEOUT_MS = 25000; // per-model timeout before trying next

// Free model fallback chain — ordered by quality/reliability
// filter(v => v && v.trim()) prevents empty strings from env vars passing through
const FREE_MODELS = [
  process.env.OPENROUTER_MODEL,
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  process.env.OPENROUTER_MODEL1,
  "mistralai/mistral-7b-instruct:free",
].filter((v) => v && v.trim());

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "Momentum",
    "X-OpenRouter-Cache": "true",
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchModel(model, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ ...body, model }),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
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

  const models = FREE_MODELS;
  if (models.length === 0) {
    throw new Error(
      "No AI models configured. Set OPENROUTER_MODEL in .env.local"
    );
  }

  let lastStatus = 0;
  let lastError = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];

    try {
      const res = await fetchModel(model, body);

      if (res.status === 429) {
        lastStatus = 429;
        // Exponential backoff before next model
        if (i < models.length - 1) await sleep(1000 * (i + 1));
        continue;
      }
      if (res.status === 402) {
        lastStatus = 402;
        continue;
      }
      if (res.status === 503 || res.status === 504) {
        lastStatus = res.status;
        if (i < models.length - 1) await sleep(1500);
        continue;
      }
      if (!res.ok) {
        lastStatus = res.status;
        continue;
      }

      return res;
    } catch (err) {
      // AbortError = our timeout, network error, etc.
      lastError = err;
      console.warn(`[AI] model ${model} failed:`, err.message);
      continue;
    }
  }

  const err = new Error(
    lastStatus === 429
      ? "Rate limit reached on all models. Wait a minute and retry."
      : lastStatus === 402
      ? "AI quota exceeded. Try again tomorrow."
      : lastError?.name === "AbortError"
      ? "AI request timed out. Please try again."
      : "AI request failed. Check your OPENROUTER_API_KEY."
  );
  err.status = lastStatus || 500;
  if (lastStatus === 429) err.code = "RATE_LIMITED";
  if (lastStatus === 402) err.code = "QUOTA_EXCEEDED";
  throw err;
}

/**
 * Non-streaming: clarify questions, re-engage prompts.
 * Low temperature for structured/predictable JSON output.
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
    max_tokens: 800, // increased: JSON array of questions needs headroom
    temperature: 0.3, // lower: more deterministic JSON output
    messages,
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text || text.trim().length < 5) {
    throw new Error("AI returned empty response. Please try again.");
  }
  return text;
}

/**
 * Streaming: blueprint generation only.
 * Higher token limit for ambitious plans.
 */
export async function aiStream(systemPrompt, userPrompt, _modelId = null) {
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const res = await fetchWithModelFallback(
    {
      max_tokens: 4000, // increased: ambitious blueprints need space
      stream: true,
      temperature: 0.3, // lower: consistent JSON structure
      messages,
    },
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
              /* skip malformed SSE lines */
            }
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      } finally {
        controller.close();
      }
    },
  });
}
