/**
 * lib/ai/puter.js — Client-side Puter.js AI wrapper
 *
 * Cold start fix: Reduced initial wait time from 2000ms to 800ms.
 * Puter.js loads async — if not available within 800ms on first visit,
 * we immediately fall back to the server API (OpenRouter) without blocking.
 * On subsequent loads (cached script), puter is available instantly.
 */

// Faster timeout for initial load detection
const PUTER_LOAD_TIMEOUT = 800;
const PUTER_CALL_TIMEOUT = 40000;
const PUTER_POLL_INTERVAL = 50;

const GENERATE_MODELS = [
  "meta-llama/llama-3.1-8b-instruct",
  "liquid/lfm-2.5-1.2b-thinking:free",
  "mistralai/ministral-3b-2512",
  "z-ai/glm-4.7-flash",
  "qwen/qwen3-235b-a22b-2507",
];

const UTILITY_MODELS = [
  "liquid/lfm-2.5-1.2b-instruct:free",
  "mistralai/mistral-nemo",
  "mistralai/ministral-3b",
  "meta-llama/llama-3.1-8b-instruct",
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
  if (response?.choices?.[0]?.message?.content) {
    return response.choices[0].message.content;
  }
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

function isValidResponse(text, isGenerateTask = false) {
  if (!text || typeof text !== "string") return false;
  const t = text.trim();
  if (t.length < 20) return false;
  if (/0\.0\.0\.0\.0\.0/.test(t) || /asdfasdf|lorem ipsum/i.test(t))
    return false;

  if (isGenerateTask) {
    try {
      const parsed = JSON.parse(t);
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed.projectTitle || parsed.oneLineGoal) &&
        Array.isArray(parsed.phases) &&
        parsed.phases.length >= 1
      ) {
        return true;
      }
      return false;
    } catch {
      const hasOpenBrace = t.includes("{");
      const hasPhasesKey =
        /"phases"\s*:\s*\[/.test(t) || /phases\s*:\s*\[/i.test(t);
      const hasTitle =
        /"projectTitle"|"oneLineGoal"|projectTitle|oneLineGoal/i.test(t);
      return hasOpenBrace && hasPhasesKey && hasTitle;
    }
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
        console.warn(`[puter] model ${model} returned invalid response`);
        lastErr = new Error(`Invalid response from ${model}`);
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
