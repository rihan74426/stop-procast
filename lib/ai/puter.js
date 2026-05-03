/**
 * Client-side Puter.js AI wrapper
 *
 * ONLY free models used — ordered by quality/reliability.
 * Falls back through the chain on any error.
 *
 * Must be called from client components only (browser SDK).
 */

const PUTER_LOAD_TIMEOUT = 12000;
const PUTER_CALL_TIMEOUT = 90000; // ambitious plans can take time

// ── Free model chains ─────────────────────────────────────────────────
// Generate (blueprint) — needs strong instruction-following
const GENERATE_MODELS = [
  "google/gemma-3n-e4b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "gryphe/mythomax-l2-13b",
];

// Clarify/reengage — lighter tasks, speed matters
const UTILITY_MODELS = [
  "meta-llama/llama-3.2-3b-instruct:free",
  "baidu/qianfan-ocr-fast:free",
  "gryphe/mythomax-l2-13b",
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
        reject(new Error("puter.js failed to load"));
      }
    }, 100);
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
      const text = response?.message?.content?.[0]?.text ?? "";
      if (!text) throw new Error("Empty response");
      return text;
    } catch (err) {
      console.warn(`[puter] model ${model} failed:`, err.message);
      lastErr = err;
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
 * Puter doesn't have native streaming; we simulate it by chunking.
 */
export async function puterStream(systemPrompt, userPrompt) {
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n${userPrompt}`
    : userPrompt;

  const fullText = await puterChatWithFallback(fullPrompt, GENERATE_MODELS);

  const encoder = new TextEncoder();
  const CHUNK = 16;

  return new ReadableStream({
    start(controller) {
      let i = 0;
      let cancelled = false;

      const push = () => {
        if (cancelled) return;
        if (i >= fullText.length) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(fullText.slice(i, i + CHUNK)));
        i += CHUNK;
        setTimeout(push, 6);
      };
      push();

      return () => {
        cancelled = true;
      };
    },
  });
}

export function isPuterAvailable() {
  return typeof window !== "undefined" && !!window.puter;
}
