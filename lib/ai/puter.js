/**
 * lib/ai/puter.js — Client-side Puter.js AI wrapper
 *
 * Auth strategy (revised):
 *   isPuterAvailable() — checks only that window.puter exists and has loaded.
 *   We attempt calls optimistically; if puter isn't authenticated it will
 *   either throw or return empty, and clientGenerate catches that and falls
 *   back to the API route. This prevents the strict auth gate from always
 *   routing to OpenRouter when puter credentials are present but the SDK
 *   hasn't confirmed sign-in yet (race condition on page load).
 */

const PUTER_LOAD_TIMEOUT = 5000;
const PUTER_CALL_TIMEOUT = 55000;

// Blueprint generation — needs strong instruction-following + JSON output
const GENERATE_MODELS = [
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

// ─── Load helper ──────────────────────────────────────────────────────

function waitForPuter(timeout = PUTER_LOAD_TIMEOUT) {
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
      ms,
    );
  });
  return Promise.race([promise, t]).finally(() => clearTimeout(timer));
}

// ─── Availability check ───────────────────────────────────────────────

/**
 * Synchronous check: is puter.js present in the page?
 * We no longer require isSignedIn() — we'll attempt the call and let it
 * fail naturally if auth is missing. This fixes the race condition where
 * puter loads but auth hasn't confirmed yet.
 *
 * We still check for the puter object AND that the ai namespace exists
 * to avoid calling into an incompletely-loaded SDK.
 */
export function isPuterAvailable() {
  if (typeof window === "undefined") return false;
  if (!window.puter) return false;
  // Check that the AI interface exists (SDK fully loaded)
  if (typeof window.puter.ai?.chat !== "function") return false;
  return true;
}

// ─── Response parsing ─────────────────────────────────────────────────

function extractPuterText(response) {
  if (!response) return "";
  if (typeof response === "string") return response;
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
  if (response?.choices?.[0]?.message?.content) {
    return response.choices[0].message.content;
  }
  return "";
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
  for (const model of models) {
    try {
      const response = await withTimeout(
        puter.ai.chat(prompt, { model }),
        PUTER_CALL_TIMEOUT,
        `puterChat(${model})`,
      );
      const text = extractPuterText(response);
      if (!text || text.trim().length < 10) {
        throw new Error(`Empty response from ${model}`);
      }
      return text;
    } catch (err) {
      console.warn(`[puter] model ${model} failed:`, err.message);
      lastErr = err;
      if (models.indexOf(model) < models.length - 1) {
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
