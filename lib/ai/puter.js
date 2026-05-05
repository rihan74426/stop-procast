/**
 * Client-side Puter.js AI wrapper
 *
 * Auth flow:
 *   Credentials (puter.app.id + puter.auth.token) are written to localStorage
 *   by an inline <script> in layout.js BEFORE puter.js loads. Puter reads
 *   them during its own initialisation and signs in silently — no popup.
 *
 *   isPuterAvailable() checks BOTH that window.puter exists AND that
 *   puter.auth.isSignedIn() is true. If auth failed (bad/expired token),
 *   we return false and let clientGenerate fall through to the API route.
 */

const PUTER_LOAD_TIMEOUT = 8000;
const PUTER_CALL_TIMEOUT = 60000;

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

// ─── Auth helpers ─────────────────────────────────────────────────────

/**
 * Wait for window.puter to be available (loads via defer in layout.js).
 */
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
      ms
    );
  });
  return Promise.race([promise, t]).finally(() => clearTimeout(timer));
}

/**
 * Synchronous gate: is puter loaded AND authenticated?
 *
 * Checking isSignedIn() here means we NEVER call puter.ai.chat()
 * in an unauthenticated state — that's exactly what triggers the popup.
 */
export function isPuterAvailable() {
  if (typeof window === "undefined") return false;
  if (!window.puter) return false;
  try {
    return window.puter.auth.isSignedIn() === true;
  } catch {
    return false;
  }
}

/**
 * Async version: waits for puter to load, then polls until
 * auth is confirmed (up to 2s) before returning the puter instance.
 *
 * Throws if auth never becomes true — caller falls back to API route.
 */
async function getAuthenticatedPuter() {
  const puter = await waitForPuter();

  // Auth may not be synchronously ready immediately after load
  if (!puter.auth.isSignedIn()) {
    await new Promise((resolve) => {
      const deadline = Date.now() + 2000;
      const poll = setInterval(() => {
        if (puter.auth.isSignedIn() || Date.now() > deadline) {
          clearInterval(poll);
          resolve();
        }
      }, 100);
    });
  }

  if (!puter.auth.isSignedIn()) {
    throw new Error(
      "Puter not authenticated — credentials missing or invalid. Falling back to API."
    );
  }

  return puter;
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
  // Verify auth before any call — prevents popup
  const puter = await getAuthenticatedPuter();

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
        throw new Error(`Empty response from ${model}`);
      }
      return text;
    } catch (err) {
      console.warn(`[puter] model ${model} failed:`, err.message);
      lastErr = err;
      if (models.indexOf(model) < models.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
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
