/**
 * Client-side Puter.js AI wrapper
 *
 * ONLY free models used — all have :free suffix confirmed.
 * Falls back through the chain on any error.
 * Must be called from client components only (browser SDK).
 */

const PUTER_LOAD_TIMEOUT = 8000; // reduced: fail fast on mobile
const PUTER_CALL_TIMEOUT = 60000; // reduced: 60s max before fallback

// ── Free model chains ─────────────────────────────────────────────────
// Blueprint generation — needs strong instruction-following + JSON output
const GENERATE_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3n-e4b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
];

// Clarify/reengage — lighter tasks, speed matters
const UTILITY_MODELS = [
  "meta-llama/llama-3.2-3b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-3n-e4b-it:free",
];

function getPuter(timeout = PUTER_LOAD_TIMEOUT) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("SSR"));
    if (window.puter) return resolve(window.puter);

    const start = Date.now();
    const check = setInterval(() => {
      if (window.puter) {
        clearInterval(check);
        resolve(window.puter);
      } else if (Date.now() - start > timeout) {
        clearInterval(check);
        reject(new Error("puter.js failed to load within timeout"));
      }
    }, 150);
  });
}

function withTimeout(promise, ms, label = "Request") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Safely extract text from puter response.
 * Puter can return: string | {message: {content: [{text}]}} | {content: string}
 */
function extractPuterText(response) {
  if (!response) return "";
  // Direct string
  if (typeof response === "string") return response;
  // Standard chat completion shape
  if (response?.message?.content) {
    const content = response.message.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content.map((c) => c?.text ?? c?.content ?? "").join("");
    }
  }
  // Alternative shape
  if (response?.content) {
    if (typeof response.content === "string") return response.content;
    if (Array.isArray(response.content)) {
      return response.content.map((c) => c?.text ?? "").join("");
    }
  }
  // choices shape (OpenAI-compatible)
  if (response?.choices?.[0]?.message?.content) {
    return response.choices[0].message.content;
  }
  return "";
}

/**
 * Try models in order, return first successful result.
 */
async function puterChatWithFallback(prompt, models) {
  const puter = await getPuter();
  let lastErr;

  for (const model of models) {
    try {
      const response = await withTimeout(
        puter.ai.chat(prompt, { model }),
        PUTER_CALL_TIMEOUT,
        `puterChat(${model})`
      );
      const text = extractPuterText(response);
      if (!text || text.trim().length < 10) {
        throw new Error(`Empty or too-short response from ${model}`);
      }
      return text;
    } catch (err) {
      console.warn(`[puter] model ${model} failed:`, err.message);
      lastErr = err;
      // Small delay between retries to avoid hammering
      if (models.indexOf(model) < models.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  throw lastErr ?? new Error("All puter models failed");
}

/**
 * Non-streaming generate — clarify questions, re-engage suggestions.
 */
export async function puterGenerate(prompt) {
  return puterChatWithFallback(prompt, UTILITY_MODELS);
}

/**
 * Streaming generate — blueprint generation.
 * Puter doesn't have native streaming; we simulate it by chunking the response.
 * Uses a cancelled flag accessible to the cancel handler.
 */
export async function puterStream(systemPrompt, userPrompt) {
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n${userPrompt}`
    : userPrompt;

  const fullText = await puterChatWithFallback(fullPrompt, GENERATE_MODELS);

  const encoder = new TextEncoder();
  const CHUNK = 24; // slightly larger chunks = faster perceived stream

  let cancelled = false;

  return new ReadableStream({
    start(controller) {
      let i = 0;

      const push = () => {
        if (cancelled) {
          controller.close();
          return;
        }
        if (i >= fullText.length) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(fullText.slice(i, i + CHUNK)));
        i += CHUNK;
        setTimeout(push, 8);
      };

      push();
    },
    cancel() {
      cancelled = true;
    },
  });
}

export function isPuterAvailable() {
  return typeof window !== "undefined" && !!window.puter;
}
