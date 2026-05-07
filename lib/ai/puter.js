/**
 * lib/ai/puter.js — Client-side Puter.js AI wrapper
 *
 * isPuterAvailable() checks that puter.js is loaded AND the ai.chat function
 * exists. We do NOT gate on isSignedIn() — puter handles auth internally.
 * If a call fails due to auth, clientGenerate catches it and falls back to
 * the API route.
 */

const PUTER_LOAD_TIMEOUT = 5000;
const PUTER_CALL_TIMEOUT = 55000;

// Blueprint generation — needs strong instruction-following + JSON output
const GENERATE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3n-e4b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
];

// Clarify/reengage — lighter tasks, speed matters
const UTILITY_MODELS = [
  "meta-llama/llama-3.2-3b-instruct:free",
  "google/gemma-3n-e4b-it:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "inclusionai/ling-2.6-1t:free",
  "baidu/qianfan-ocr-fast:free",
  "mistralai/mistral-nemo",
];

// ─── Load helper ──────────────────────────────────────────────────────

function waitForPuter(timeout = PUTER_LOAD_TIMEOUT) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("SSR"));
    if (window.puter?.ai?.chat) return resolve(window.puter);

    const start = Date.now();
    const check = setInterval(() => {
      if (window.puter?.ai?.chat) {
        clearInterval(check);
        resolve(window.puter);
      } else if (Date.now() - start > timeout) {
        clearInterval(check);
        reject(new Error("puter.js did not load within timeout"));
      }
    }, 150);
  });
}

function withTimeout(promise, ms, label = "Request") {
  let timer;
  const t = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
      ms
    );
  });
  return Promise.race([promise, t]).finally(() => clearTimeout(timer));
}

// ─── Availability check ───────────────────────────────────────────────

export function isPuterAvailable() {
  if (typeof window === "undefined") return false;
  return typeof window.puter?.ai?.chat === "function";
}

// ─── Response parsing ─────────────────────────────────────────────────

function extractPuterText(response) {
  if (!response) return "";
  if (typeof response === "string") return response;
  // Standard OpenAI-compatible shape
  if (response?.choices?.[0]?.message?.content) {
    return response.choices[0].message.content;
  }
  // Puter-specific shapes
  if (response?.message?.content) {
    const c = response.message.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c))
      return c.map((x) => x?.text ?? x?.content ?? "").join("");
  }
  if (response?.content) {
    if (typeof response.content === "string") return response.content;
    if (Array.isArray(response.content))
      return response.content.map((x) => x?.text ?? "").join("");
  }
  return String(response);
}

// ─── Model fallback chain ─────────────────────────────────────────────

async function puterChatWithFallback(prompt, models) {
  let puter;
  try {
    puter = await waitForPuter();
  } catch (err) {
    throw new Error(`Puter not available: ${err.message}`);
  }

  let lastErr;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const response = await withTimeout(
        puter.ai.chat(prompt, { model }),
        PUTER_CALL_TIMEOUT,
        `puterChat(${model})`
      );
      const text = extractPuterText(response);
      if (!text || text.trim().length < 10) {
        throw new Error(`Empty response from ${model}`);
      }
      return text;
    } catch (err) {
      console.warn(`[puter] model ${model} failed:`, err.message);
      lastErr = err;
      if (i < models.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  }

  throw lastErr ?? new Error("All puter models failed");
}

// ─── Public API ───────────────────────────────────────────────────────

export async function puterGenerate(prompt) {
  return puterChatWithFallback(prompt, UTILITY_MODELS);
}

/**
 * puterStream: gets full text from puter then emits it as a ReadableStream
 * of Uint8Array chunks. Simulates streaming for the StepReview reader loop.
 */
export async function puterStream(systemPrompt, userPrompt) {
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n${userPrompt}`
    : userPrompt;

  const fullText = await puterChatWithFallback(fullPrompt, GENERATE_MODELS);

  const encoder = new TextEncoder();
  const CHUNK = 24;
  let cancelled = false;

  return new ReadableStream({
    start(controller) {
      let i = 0;
      function push() {
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
      }
      push();
    },
    cancel() {
      cancelled = true;
    },
  });
}
