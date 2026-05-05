/**
 * lib/ai/clientGenerate.js — Client-side AI orchestrator
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

// ─── Puter credential injection (runs once, client-side only) ─────────
let _credentialsInjected = false;

function injectPuterCredentials() {
  if (typeof window === "undefined" || _credentialsInjected) return;
  _credentialsInjected = true;
  try {
    const appId = process.env.NEXT_PUBLIC_PUTER_APP_ID;
    const authToken = process.env.NEXT_PUBLIC_PUTER_AUTH_TOKEN;
    if (appId?.trim() && !localStorage.getItem("puter.app.id")) {
      localStorage.setItem("puter.app.id", appId.trim());
    }
    if (authToken?.trim() && !localStorage.getItem("puter.auth.token")) {
      localStorage.setItem("puter.auth.token", authToken.trim());
    }
  } catch {
    /* localStorage may be blocked in some environments */
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

  // lean/standard → try puter first (free, client-side, no server cost)
  if (!isDeepMode && isPuterAvailable()) {
    try {
      notifyAIProvider("puter");
      const userPrompt = buildUserPrompt({
        idea,
        clarifications,
        scopeLevel,
        profileContext,
      });
      return await puterStream(SYSTEM_PROMPT, userPrompt);
    } catch (err) {
      console.warn(
        "[AI] Puter blueprint failed, falling back to API:",
        err.message
      );
      notifyAIError(
        "puter",
        err.message?.includes("timed out") ? "timeout" : "empty"
      );
      notifyAIProvider("openrouter", "fallback");
      // Fall through to API route
    }
  } else if (isDeepMode) {
    notifyAIProvider("openrouter", "deepmode");
  } else {
    // Puter not available
    notifyAIProvider("openrouter", "fallback");
  }

  // API route (OpenRouter)
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
