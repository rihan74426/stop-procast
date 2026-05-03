/**
 * Client-side AI generation orchestrator
 *
 * Routing:
 *   lean / standard  → puter.js (free models, client-side)
 *   ambitious        → POST /api/generate (OpenRouter free tier, server-side)
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

export function injectPuterCredentials() {
  if (typeof window === "undefined") return;
  try {
    const appId = process.env.NEXT_PUBLIC_PUTER_APP_ID;
    const authToken = process.env.NEXT_PUBLIC_PUTER_AUTH_TOKEN;
    if (appId && !localStorage.getItem("puter.app.id")) {
      localStorage.setItem("puter.app.id", appId);
    }
    if (authToken && !localStorage.getItem("puter.auth.token")) {
      localStorage.setItem("puter.auth.token", authToken);
    }
  } catch {
    /* localStorage may be blocked */
  }
}

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
      /* ignore */
    }
    const err = new Error(data.error ?? `Generation failed (${res.status})`);
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

  // Try puter for lean/standard
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
      notifyAIError(
        "puter",
        err.message?.includes("timeout") ? "timeout" : "empty"
      );
      notifyAIProvider("openrouter", "fallback");
    }
  } else if (isDeepMode) {
    notifyAIProvider("openrouter", "deepmode");
  } else {
    notifyAIProvider("openrouter", "fallback");
  }

  // API route fallback (OpenRouter free tier)
  const res = await callGenerateAPI({
    type: "generate",
    idea,
    clarifications,
    scopeLevel,
    profileContext: typeof profileContext === "string" ? profileContext : "",
  });

  return res.body;
}

// ─── Clarify questions ────────────────────────────────────────────────

export async function generateClarifyQuestions(idea) {
  if (isPuterAvailable()) {
    try {
      return await puterGenerate(buildClarifyPrompt(idea));
    } catch (err) {
      console.warn("[AI] Puter clarify failed, using API:", err.message);
      notifyAIProvider("openrouter", "fallback");
    }
  }

  const res = await callGenerateAPI({ type: "clarify", idea });
  const data = await res.json();
  return data.questions ?? "[]";
}

// ─── Re-engage suggestion ─────────────────────────────────────────────

export async function generateReengage(project) {
  if (isPuterAvailable()) {
    try {
      return await puterGenerate(buildReengagePrompt(project));
    } catch (err) {
      console.warn("[AI] Puter reengage failed, using API:", err.message);
    }
  }

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
