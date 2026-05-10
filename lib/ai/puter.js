/**
 * lib/ai/puter.js — Client-side Puter.js AI wrapper
 *
 * Timeout changes:
 *   PUTER_LOAD_TIMEOUT: 5000 → 2000ms
 *     The puter CDN script is loaded with `defer` — if it hasn't
 *     initialized within 2s of this function being called, the API
 *     route fallback is a better user experience than waiting 5 more
 *     seconds for an uncertain load.
 *
 *   Poll interval: 150ms → 50ms
 *     Faster polling means we detect a loaded puter almost instantly
 *     when it IS available, and hit the 2s timeout faster when it isn't.
 *
 * isPuterAvailable() is still synchronous (reads window.puter set by CDN)
 * and is the first check in clientGenerate.js — the timeout here only
 * matters when puter IS nominally available but ai.chat is slow to init.
 */

const PUTER_LOAD_TIMEOUT = 2000; // was 5000 — fail fast to API fallback
const PUTER_CALL_TIMEOUT = 55000;
const PUTER_POLL_INTERVAL = 50; // was 150 — detect availability faster

const GENERATE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3n-e4b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
];

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
        reject(
          new Error(
            `puter.js not ready after ${timeout}ms — using API fallback`
          )
        );
      }
    }, PUTER_POLL_INTERVAL);
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

// ─── Availability check (synchronous) ────────────────────────────────

export function isPuterAvailable() {
  if (typeof window === "undefined") return false;
  return typeof window.puter?.ai?.chat === "function";
}

// ─── Response parsing ─────────────────────────────────────────────────

function extractPuterText(response) {
  if (!response) return "";
  if (typeof response === "string") return response;
  if (response?.choices?.[0]?.message?.content) {
    return response.choices[0].message.content;
  }
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
      // Brief pause between model attempts — don't hammer the API
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
 * puterStream: gets full text from puter then emits as a ReadableStream
 * of Uint8Array chunks — simulates streaming for the StepReview reader loop.
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
