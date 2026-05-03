/**
 * Client-side AI generation orchestrator
 *
 * Routing:
 *   lean / standard  → puter.js (claude-sonnet-4, free & unlimited)
 *   ambitious        → POST /api/generate (OpenRouter, deep mode)
 *
 * Puter credentials are injected before first use via injectPuterCredentials().
 * AI provider switches are surfaced to users via toast notifications.
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

/**
 * Inject Puter credentials into localStorage before first AI call.
 * Must be called client-side only.
 * Credentials come from NEXT_PUBLIC_ env vars set at build time.
 */
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
    // localStorage may be blocked in some contexts — safe to ignore
  }
}

// Inject on module load (client-side only)
if (typeof window !== "undefined") {
  injectPuterCredentials();
}

// ─── Blueprint generation (streaming) ────────────────────────────────

export async function generateBlueprint({
  idea,
  clarifications,
  scopeLevel,
  profileContext,
}) {
  const isDeepMode = scopeLevel === "ambitious";

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
      console.warn("[AI] Puter failed, falling back to API:", err.message);
      notifyAIError(
        "puter",
        err.message?.includes("timeout") ? "timeout" : "empty",
      );
      notifyAIProvider("openrouter", "fallback");
      // Fall through to API route
    }
  } else if (isDeepMode) {
    notifyAIProvider("openrouter", "deepmode");
  } else {
    // puter not available
    notifyAIProvider("openrouter", "fallback");
  }

  // OpenRouter path — ambitious scope OR puter unavailable/failed
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "generate",
      idea,
      clarifications,
      scopeLevel,
      profileContext: typeof profileContext === "string" ? profileContext : "",
    }),
  });

  if (!res.ok) {
    let data = {};
    try {
      data = await res.json();
    } catch {
      /* ignore parse errors */
    }
    const err = new Error(data.error ?? `Generation failed (${res.status})`);
    err.code = data.code;
    err.status = res.status;
    if (res.status === 429) notifyAIError("openrouter", "ratelimit");
    if (res.status === 402) notifyAIError("openrouter", "quota");
    throw err;
  }

  return res.body;
}

// ─── Clarify questions (non-streaming) ───────────────────────────────

export async function generateClarifyQuestions(idea) {
  if (isPuterAvailable()) {
    try {
      const text = await puterGenerate(buildClarifyPrompt(idea));
      return text;
    } catch (err) {
      console.warn("[AI] Puter clarify failed, using API:", err.message);
      notifyAIProvider("openrouter", "fallback");
    }
  }

  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "clarify", idea }),
  });
  if (!res.ok) {
    let data = {};
    try {
      data = await res.json();
    } catch {
      /* ignore */
    }
    throw new Error(data.error ?? "Failed to load questions");
  }
  const data = await res.json();
  return data.questions;
}

// ─── Re-engage suggestion (non-streaming) ────────────────────────────

export async function generateReengage(project) {
  if (isPuterAvailable()) {
    try {
      const text = await puterGenerate(buildReengagePrompt(project));
      return text;
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
