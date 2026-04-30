// Server-only AI client
// Adds X-OpenRouter-Cache header for free-tier caching on repeated prompts

const API_BASE = "https://openrouter.ai/api/v1";

function getHeaders(enableCache = false) {
  const h = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "Momentum",
  };
  // OpenRouter beta caching — zero cost on cache hits
  if (enableCache) h["X-OpenRouter-Cache"] = "true";
  return h;
}

function getPrimaryModel() {
  return process.env.OPENROUTER_MODEL ?? "openrouter/auto";
}

function getFallbackModel() {
  return (
    process.env.OPENROUTER_MODEL1 ?? "meta-llama/llama-3.2-3b-instruct:free"
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Log usage for monitoring — helps identify expensive calls
function logUsage(type, data) {
  if (data?.usage) {
    const { prompt_tokens, completion_tokens, total_tokens } = data.usage;
    console.log(
      `[AI:${type}] tokens — prompt:${prompt_tokens} completion:${completion_tokens} total:${total_tokens}`
    );
  }
}

async function fetchWithRetry(url, body, opts = {}) {
  const { maxRetries = 2, enableCache = false } = opts;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) await sleep(2000 * attempt);

    const model = attempt < maxRetries ? getPrimaryModel() : getFallbackModel();
    const payload = { ...body, model };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(enableCache),
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        lastError = { status: 429, message: "Rate limit reached." };
        await sleep(3000);
        continue;
      }
      if (res.status === 402) {
        lastError = { status: 402, message: "AI quota exceeded." };
        continue;
      }
      if (!res.ok) {
        lastError = { status: res.status, message: `AI error (${res.status})` };
        continue;
      }
      return res;
    } catch (err) {
      lastError = { status: 0, message: "Network error." };
    }
  }

  const err = new Error(lastError?.message ?? "AI request failed.");
  err.status = lastError?.status ?? 500;
  throw err;
}

/**
 * Non-streaming: clarify questions, re-engage prompts.
 * Cache enabled — these prompts are often repeated or templated.
 */
export async function aiGenerate(
  userPrompt,
  _modelId = null,
  systemPrompt = null
) {
  if (!process.env.OPENROUTER_API_KEY)
    throw new Error("AI service not configured.");

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const res = await fetchWithRetry(
    `${API_BASE}/chat/completions`,
    { max_tokens: 350, messages, temperature: 0.7 },
    { enableCache: true } // cache clarify/reengage — often same structure
  );

  const data = await res.json();
  logUsage("generate", data);
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Streaming: blueprint generation only.
 * Cache disabled — each blueprint is unique.
 */
export async function aiStream(systemPrompt, userPrompt, _modelId = null) {
  if (!process.env.OPENROUTER_API_KEY)
    throw new Error("AI service not configured.");

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const res = await fetchWithRetry(
    `${API_BASE}/chat/completions`,
    { max_tokens: 2500, stream: true, temperature: 0.7, messages },
    { enableCache: false }
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
