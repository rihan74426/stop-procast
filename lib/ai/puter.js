/**
 * lib/ai/puter.js — Client-side Puter.js AI wrapper
 *
 * Model strategy:
 * GENERATE_MODELS: For blueprint JSON. Needs instruction-following, multilingual,
 *   structured output. Sorted: free first, then cheap paid fallbacks.
 * UTILITY_MODELS: For clarify questions + re-engage. Smaller/faster is fine.
 *
 * Key fixes:
 * - Removed models that produce garbled output on non-English prompts
 *   (llama-3-8b, nemotron-reasoning, nvidia/nemotron-3-nano-omni which
 *    returns null content with reasoning loop)
 * - Added stronger free models: Qwen3, DeepSeek V3, Gemma 4
 * - Added content validation to detect garbled responses before returning
 */

const PUTER_LOAD_TIMEOUT = 2000;
const PUTER_CALL_TIMEOUT = 55000;
const PUTER_POLL_INTERVAL = 50;

// ─── GENERATE_MODELS ─────────────────────────────────────────────────
// Used for blueprint generation — must produce valid JSON, handle Bengali/Arabic/etc.
// Order: best free → reliable cheap → last resort cheap
const GENERATE_MODELS = [
  // Tier 1: Free, strong multilingual instruction following
  "meta-llama/llama-3.1-8b-instruct", // $0.02/$0.05 — cheap reliable fallback
  "liquid/lfm-2.5-1.2b-thinking:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "mistralai/ministral-3b-2512",

  "z-ai/glm-4.7-flash",
  "openai/gpt-oss-120b",

  // Tier 2: Cheap paid fallbacks (< $0.15/M input)
  "qwen/qwen3-235b-a22b-2507", // Qwen3 235B MoE — excellent JSON + multilingual
];

// const GENERATE_MODELS = [
//   "meta-llama/llama-3.3-70b-instruct:free",
//   "liquid/lfm-2.5-1.2b-instruct:free",
//   "inclusionai/ling-2.6-1t:free",
//   "google/gemma-4-26b-a4b-it",
//   "meta-llama/llama-3-8b-instruct", // $0.04 / $0.04
//   "mistralai/mistral-nemo",
// ];

// const UTILITY_MODELS = [
//   "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
//   "poolside/laguna-xs.2:free",
//   "z-ai/glm-4.6v-flash",
//   "mistralai/ministral-3b-2512", //$0.04 / $0.04
//   "meta-llama/llama-3.1-8b-instruct", //$0.02 / $0.05
//   "z-ai/glm-4.7-flashx",
//   "meta-llama/llama-3.2-3b-instruct:free",
//   "liquid/lfm-2.5-1.2b-instruct:free",
//   "google/gemma-3-4b-it",
// ];
// ─── UTILITY_MODELS ───────────────────────────────────────────────────
// Used for clarify questions + re-engage. Simpler prompts, smaller is fine.
const UTILITY_MODELS = [
  "liquid/lfm-2.5-1.2b-instruct:free", // Free, ultra-fast
  "mistralai/mistral-nemo",
  "mistralai/ministral-3b", // $0.04/$0.04 — very cheap
  "google/gemma-3-4b-it", // Free, lightweight
  "meta-llama/llama-3.1-8b-instruct", // $0.02/$0.05 — cheap
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
        reject(new Error(`puter.js not ready after ${timeout}ms`));
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

export function isPuterAvailable() {
  if (typeof window === "undefined") return false;
  return typeof window.puter?.ai?.chat === "function";
}

// ─── Response parsing ─────────────────────────────────────────────────

function extractPuterText(response) {
  if (!response) return "";
  if (typeof response === "string") return response;
  // Standard OpenAI-style response
  if (response?.choices?.[0]?.message?.content) {
    return response.choices[0].message.content;
  }
  // Puter-wrapped response
  if (response?.result?.message?.content) {
    const c = response.result.message.content;
    if (typeof c === "string") return c;
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

/**
 * Validate that the response looks like useful structured content.
 * Rejects:
 * - null/empty content
 * - responses where content is all reasoning (0.0.0.0 loops from nemotron)
 * - responses shorter than minimum meaningful length
 * - responses that are only "reasoning" with null content
 */
function isValidResponse(text, isGenerateTask = false) {
  if (!text || typeof text !== "string") return false;
  const t = text.trim();
  if (t.length < 20) return false;

  // Detect nemotron-style reasoning loop garbage (repeating 0.0.0.0...)
  if (/0\.0\.0\.0\.0\.0\.0\.0/.test(t)) return false;

  // For generate tasks, must contain JSON structure
  if (isGenerateTask) {
    const hasOpenBrace = t.includes("{");
    const hasProjectTitle =
      t.includes("projectTitle") || t.includes('"phases"');
    return hasOpenBrace && hasProjectTitle;
  }

  return true;
}

// ─── Model fallback chain ─────────────────────────────────────────────

async function puterChatWithFallback(prompt, models, isGenerateTask = false) {
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
      const rawResponse = await withTimeout(
        puter.ai.chat(prompt, { model }),
        PUTER_CALL_TIMEOUT,
        `puterChat(${model})`
      );

      const text = extractPuterText(rawResponse);

      if (!isValidResponse(text, isGenerateTask)) {
        console.warn(
          `[puter] model ${model} returned invalid/garbled response, trying next`
        );
        lastErr = new Error(`Garbled or empty response from ${model}`);
        if (i < models.length - 1) await new Promise((r) => setTimeout(r, 200));
        continue;
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
  return puterChatWithFallback(prompt, UTILITY_MODELS, false);
}

/**
 * puterStream: gets full text then emits as ReadableStream chunks.
 * Uses GENERATE_MODELS with isGenerateTask=true for strict validation.
 */
export async function puterStream(systemPrompt, userPrompt) {
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n${userPrompt}`
    : userPrompt;

  const fullText = await puterChatWithFallback(
    fullPrompt,
    GENERATE_MODELS,
    true
  );

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
