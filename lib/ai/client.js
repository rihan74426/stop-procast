/**
 * lib/ai/client.js — Server-only AI client (OpenRouter)
 *
 * Improvements:
 * - Deduplicated model list
 * - Smarter per-model timeout (longer for streaming)
 * - Exponential backoff between retries
 * - Distinguishes transient vs permanent failures
 * - No fallback to next model on 402 (quota exhausted globally)
 */

const API_BASE = "https://openrouter.ai/api/v1";

const STREAM_TIMEOUT_MS = 45000;
const GENERATE_TIMEOUT_MS = 20000;

// Build deduped model list at startup
function buildModelList() {
  const raw = [
    process.env.OPENROUTER_MODEL,
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    process.env.OPENROUTER_MODEL1,
    "mistralai/mistral-7b-instruct:free",
  ];
  // Filter empty, deduplicate while preserving order
  const seen = new Set();
  return raw.filter((v) => {
    if (!v || !v.trim()) return false;
    if (seen.has(v)) return false;
    seen.add(v);
    return true;
  });
}

const FREE_MODELS = buildModelList();

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

async function fetchModel(model, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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
 * Try each model in order. Stops immediately on 402 (quota exhausted for all).
 * Returns the raw Response.
 */
async function fetchWithModelFallback(body, { stream = false } = {}) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw Object.assign(
      new Error(
        "AI service not configured. Add OPENROUTER_API_KEY to .env.local"
      ),
      { status: 500 }
    );
  }
  if (FREE_MODELS.length === 0) {
    throw Object.assign(
      new Error("No AI models configured. Set OPENROUTER_MODEL in .env.local"),
      { status: 500 }
    );
  }

  const timeoutMs = stream ? STREAM_TIMEOUT_MS : GENERATE_TIMEOUT_MS;
  let lastStatus = 0;
  let lastError = null;

  for (let i = 0; i < FREE_MODELS.length; i++) {
    const model = FREE_MODELS[i];
    try {
      const res = await fetchModel(model, body, timeoutMs);

      if (res.status === 402) {
        // Quota exhausted — no point trying other models on this provider
        lastStatus = 402;
        break;
      }
      if (res.status === 429) {
        lastStatus = 429;
        if (i < FREE_MODELS.length - 1) {
          // Exponential backoff: 1s, 2s, 4s…
          await sleep(Math.min(1000 * Math.pow(2, i), 8000));
        }
        continue;
      }
      if (res.status === 503 || res.status === 504) {
        lastStatus = res.status;
        if (i < FREE_MODELS.length - 1) await sleep(1500);
        continue;
      }
      if (!res.ok) {
        lastStatus = res.status;
        // Don't retry on 4xx client errors (bad request, auth, etc.)
        if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;
      console.warn(`[AI] model ${model} failed:`, err.message);
      // Don't retry on abort (our own timeout)
      if (err.name === "AbortError" && i < FREE_MODELS.length - 1) {
        await sleep(500);
      }
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
      : `AI request failed (${
          lastStatus || "network error"
        }). Check your OPENROUTER_API_KEY.`
  );
  err.status = lastStatus || 500;
  if (lastStatus === 429) err.code = "RATE_LIMITED";
  if (lastStatus === 402) err.code = "QUOTA_EXCEEDED";
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
    max_tokens: 800,
    temperature: 0.3,
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
 */
export async function aiStream(systemPrompt, userPrompt, _modelId = null) {
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const res = await fetchWithModelFallback(
    {
      max_tokens: 4000,
      stream: true,
      temperature: 0.3,
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
        // Flush remaining buffer
        if (buffer.trim() && buffer.trim().startsWith("data: ")) {
          try {
            const json = JSON.parse(buffer.trim().slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {
            /* ignore */
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
