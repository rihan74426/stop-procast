/**
 * Client-side AI generation orchestrator
 *
 * Routing:
 *   lean / standard  → puter.js (free models, client-side)
 *   ambitious        → POST /api/generate (OpenRouter, server-side)
 *   puter failure    → POST /api/generate (automatic fallback)
 */

import { puterGenerate, puterStream, isPuterAvailable } from "./puter";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  buildClarifyPrompt,
  buildReengagePrompt,
} from "./prompts";
import { notifyAIProvider, notifyAIError } from "./aiStatus";

// ─── Puter credential injection ───────────────────────────────────────
// Only inject if values are present and not already set

function injectPuterCredentials() {
  if (typeof window === "undefined") return;
  try {
    const appId = process.env.NEXT_PUBLIC_PUTER_APP_ID;
    const authToken = process.env.NEXT_PUBLIC_PUTER_AUTH_TOKEN;
    if (appId && appId.trim() && !localStorage.getItem("puter.app.id")) {
      localStorage.setItem("puter.app.id", appId.trim());
    }
    if (
      authToken &&
      authToken.trim() &&
      !localStorage.getItem("puter.auth.token")
    ) {
      localStorage.setItem("puter.auth.token", authToken.trim());
    }
  } catch {
    /* localStorage may be blocked in some environments */
  }
}

// Run once on module load (client-side only)
if (typeof window !== "undefined") {
  injectPuterCredentials();
}

// ─── API route helper ─────────────────────────────────────────────────

async function callGenerateAPI(body) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let data = {};
    try {
      data = await res.json();
    } catch {
      /* ignore parse error */
    }
    const err = new Error(
      data.error ?? `Generation failed (HTTP ${res.status})`
    );
    err.code = data.code;
    err.status = res.status;
    throw err;
  }

  return res;
}

// ─── Blueprint generation (streaming) ────────────────────────────────

export async function generateBlueprint({
  idea,
  clarifications,
  scopeLevel,
  profileContext,
}) {
  const isDeepMode = scopeLevel === "ambitious";

  // lean/standard → try puter first (free, client-side)
  if (!isDeepMode && isPuterAvailable()) {
    try {
      notifyAIProvider("puter");
      const userPrompt = buildUserPrompt({
        idea,
        clarifications,
        scopeLevel,
        profileContext,
      });
      const stream = await puterStream(SYSTEM_PROMPT, userPrompt);
      return stream;
    } catch (err) {
      console.warn(
        "[AI] Puter blueprint failed, falling back to API:",
        err.message
      );
      const errType = err.message?.includes("timed out") ? "timeout" : "empty";
      notifyAIError("puter", errType);
      notifyAIProvider("openrouter", "fallback");
      // Fall through to API route below
    }
  } else if (isDeepMode) {
    notifyAIProvider("openrouter", "deepmode");
  } else {
    notifyAIProvider("openrouter", "fallback");
  }

  // API route fallback (OpenRouter)
  const res = await callGenerateAPI({
    type: "generate",
    idea,
    clarifications,
    scopeLevel,
    profileContext: typeof profileContext === "string" ? profileContext : "",
  });

  if (!res.body) {
    throw new Error("AI returned empty stream. Please try again.");
  }

  return res.body;
}

// ─── Clarify questions ────────────────────────────────────────────────

export async function generateClarifyQuestions(idea) {
  // Try puter first
  if (isPuterAvailable()) {
    try {
      const text = await puterGenerate(buildClarifyPrompt(idea));
      return text; // parser handles JSON extraction
    } catch (err) {
      console.warn("[AI] Puter clarify failed, using API:", err.message);
      notifyAIProvider("openrouter", "fallback");
    }
  }

  // API route fallback
  const res = await callGenerateAPI({ type: "clarify", idea });
  const data = await res.json();

  // API returns { questions: "<text>" } — extract the string
  return data.questions ?? "[]";
}

// ─── Re-engage suggestion ─────────────────────────────────────────────

export async function generateReengage(project) {
  // Try puter first
  if (isPuterAvailable()) {
    try {
      return await puterGenerate(buildReengagePrompt(project));
    } catch (err) {
      console.warn("[AI] Puter reengage failed, using API:", err.message);
    }
  }

  // API route fallback
  try {
    const res = await fetch("/api/reengage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.suggestion ?? null;
  } catch {
    return null;
  }
}
