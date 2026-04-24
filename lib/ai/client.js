// Server-only AI client
// Uses a single free model with one fallback. No model picker exposed to users.

const API_BASE = "https://openrouter.ai/api/v1";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "Momentum",
  };
}

// Primary: env var, fallback chain to known free models
function getPrimaryModel() {
  return process.env.OPENROUTER_MODEL ?? "openrouter/auto";
}

function getFallbackModel() {
  return (
    process.env.OPENROUTER_MODEL1 ?? "meta-llama/llama-3.2-3b-instruct:free"
  );
}

// Sleep helper for backoff
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, body, maxRetries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 2s, 4s
      await sleep(2000 * attempt);
    }

    const model = attempt < maxRetries ? getPrimaryModel() : getFallbackModel();
    const payload = { ...body, model };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        lastError = {
          status: 429,
          message: "Rate limit reached. Please wait a moment.",
        };
        // On 429, switch to fallback immediately and wait longer
        await sleep(3000);
        continue;
      }

      if (res.status === 402) {
        lastError = {
          status: 402,
          message: "AI service credit limit reached.",
        };
        continue;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        lastError = {
          status: res.status,
          message: `AI service error (${res.status})`,
        };
        continue;
      }

      return res;
    } catch (err) {
      lastError = {
        status: 0,
        message: "Network error — check your connection.",
      };
    }
  }

  const err = new Error(
    lastError?.message ?? "AI request failed after retries."
  );
  err.status = lastError?.status ?? 500;
  throw err;
}

/**
 * Non-streaming: clarify questions, re-engage prompts
 * Kept intentionally short (max_tokens: 400) to save quota
 */
export async function aiGenerate(
  userPrompt,
  _modelId = null,
  systemPrompt = null
) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("AI service is not configured.");
  }

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const res = await fetchWithRetry(`${API_BASE}/chat/completions`, {
    max_tokens: 400,
    messages,
    temperature: 0.7,
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Streaming: blueprint generation only
 * Higher token budget but only called once per project
 */
export async function aiStream(systemPrompt, userPrompt, _modelId = null) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("AI service is not configured.");
  }

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const res = await fetchWithRetry(`${API_BASE}/chat/completions`, {
    max_tokens: 3000,
    stream: true,
    temperature: 0.7,
    messages,
  });

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
              // skip malformed chunks
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}
