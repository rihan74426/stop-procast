/**
 * Client-side Puter.js AI wrapper
 *
 * Puter.js is a browser SDK — it CANNOT be used in Next.js API routes.
 * Must be called from client components only.
 *
 * Models:
 *   - Standard/Lean scope  → claude-sonnet-4   (fast, free, unlimited)
 *   - Ambitious scope      → OpenRouter via API route (deep mode)
 */

const PUTER_LOAD_TIMEOUT = 10000; // 10s to load the script
const PUTER_CALL_TIMEOUT = 30000; // 30s for AI response (ambitious plans take long)

// Wait for puter global to be available (async script load)
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
    }, 100);
  });
}

/**
 * Wrap a promise with a timeout — rejects after ms with a clear error.
 */
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
 * Non-streaming generate via puter.ai.chat
 * Used for: clarify questions, re-engage suggestions
 */

// other free models: poolside/laguna-xs.2:free - baidu/qianfan-ocr-fast:free - qwen/qwen3.6-plus-preview:free

export async function puterGenerate(
  prompt,
  model = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
) {
  const puter = await getPuter();
  const response = await withTimeout(
    puter.ai.chat(prompt, { model }),
    PUTER_CALL_TIMEOUT,
    "puterGenerate"
  );
  // puter returns { message: { content: [{ text: "..." }] } }
  const text = response?.message?.content?.[0]?.text ?? "";
  if (!text) throw new Error("Puter returned empty response");
  return text;
}

/**
 * Streaming generate via puter.ai.chat
 * Puter doesn't have native streaming — we simulate it by chunking the response
 * into a ReadableStream so the UI behaves identically to the OpenRouter path.
 *
 * Used for: blueprint generation (lean + standard scope)
 */
export async function puterStream(
  systemPrompt,
  userPrompt,
  model = "claude-sonnet-4"
) {
  const puter = await getPuter();

  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n${userPrompt}`
    : userPrompt;

  const response = await withTimeout(
    puter.ai.chat(fullPrompt, { model }),
    PUTER_CALL_TIMEOUT,
    "puterStream"
  );

  const fullText = response?.message?.content?.[0]?.text ?? "";
  if (!fullText) throw new Error("Puter returned empty response");

  // Simulate streaming by chunking the text
  const encoder = new TextEncoder();
  const CHUNK = 12; // chars per chunk

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
        const slice = fullText.slice(i, i + CHUNK);
        controller.enqueue(encoder.encode(slice));
        i += CHUNK;
        setTimeout(push, 8);
      };
      push();

      return () => {
        cancelled = true;
      };
    },
    cancel() {
      // ReadableStream cancel — mark done
    },
  });
}

/**
 * Check if puter is available in this environment
 */
export function isPuterAvailable() {
  return typeof window !== "undefined" && !!window.puter;
}
