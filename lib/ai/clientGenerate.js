/**
 * Client-side AI generation orchestrator
 *
 * Routing:
 *   lean / standard  → puter.js (free, client-side) — only if authenticated
 *   ambitious        → POST /api/generate (OpenRouter, server-side)
 *   puter unavailable / auth failed / call failed → POST /api/generate
 *
 * Credential injection is handled entirely by the inline <script> in
 * app/layout.js, which runs BEFORE puter.js loads. Do NOT inject
 * credentials here — by the time this module runs, puter may already
 * have initialised without them.
 */

import { puterGenerate, puterStream, isPuterAvailable } from "./puter";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  buildClarifyPrompt,
  buildReengagePrompt,
} from "./prompts";
import { notifyAIProvider, notifyAIError } from "./aiStatus";

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

  // lean/standard → try puter first, but only if auth is confirmed
  // isPuterAvailable() checks both window.puter AND puter.auth.isSignedIn()
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
      // fall through
    }
  } else if (isDeepMode) {
    notifyAIProvider("openrouter", "deepmode");
  } else {
    // Puter not available or not authenticated — use API silently
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
      const text = await puterGenerate(buildClarifyPrompt(idea));
      return text;
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
