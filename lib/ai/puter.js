/**
 * Client-side Puter.js AI wrapper
 *
 * Puter.js is a browser SDK — it CANNOT be used in Next.js API routes.
 * It must be called from client components only.
 *
 * Models:
 *   - Standard/Lean scope  → claude-sonnet-4   (fast, free, unlimited)
 *   - Ambitious scope      → OpenRouter via API route (deep mode)
 *
 * puter is injected as a global via <script src="https://js.puter.com/v2/" />
 */

// Wait for puter global to be available (async script load)
function getPuter(timeout = 8000) {
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

/**
 * Non-streaming generate via puter.ai.chat
 * Used for: clarify questions, re-engage suggestions
 */
export async function puterGenerate(prompt, model = "claude-sonnet-4") {
  const puter = await getPuter();
  const response = await puter.ai.chat(prompt, { model });
  // puter returns { message: { content: [{ text: "..." }] } }
  return response?.message?.content?.[0]?.text ?? "";
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

  const response = await puter.ai.chat(fullPrompt, { model });
  const fullText = response?.message?.content?.[0]?.text ?? "";

  // Simulate streaming by chunking the text
  const encoder = new TextEncoder();
  const CHUNK = 12; // chars per chunk

  return new ReadableStream({
    start(controller) {
      let i = 0;
      const push = () => {
        if (i >= fullText.length) {
          controller.close();
          return;
        }
        const slice = fullText.slice(i, i + CHUNK);
        controller.enqueue(encoder.encode(slice));
        i += CHUNK;
        // Simulate network delay for visual effect
        setTimeout(push, 8);
      };
      push();
    },
  });
}

/**
 * Check if puter is available in this environment
 */
export function isPuterAvailable() {
  return typeof window !== "undefined" && !!window.puter;
}
