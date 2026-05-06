/**
 * lib/ai/clientGenerate.js — Client-side AI generation orchestrator
 *
 * Routing (fixed):
 *   1. lean / standard → try puter.js first (free, client-side)
 *      - isPuterAvailable() now checks only that puter.ai.chat exists (no auth gate)
 *      - If the call fails for any reason, fall through to OpenRouter API
 *   2. ambitious → always use POST /api/generate (OpenRouter, server-side)
 *   3. Fallback: POST /api/generate on any puter failure
 *
 * Key fix: removed the strict puter.auth.isSignedIn() gate from isPuterAvailable().
 * Puter is now tried optimistically — auth errors surface as call failures
 * and are caught here, triggering the API fallback gracefully.
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
      data.error ?? `Generation failed (HTTP ${res.status})`,
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

  // Deep mode always goes to OpenRouter (needs more tokens / better model)
  if (isDeepMode) {
    notifyAIProvider("openrouter", "deepmode");
  } else if (isPuterAvailable()) {
    // Try puter first for lean/standard
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
        err.message,
      );
      const errType = err.message?.includes("timed out") ? "timeout" : "empty";
      notifyAIError("puter", errType);
      notifyAIProvider("openrouter", "fallback");
      // fall through to API route below
    }
  } else {
    // Puter not loaded — use API silently (no toast spam)
    console.info("[AI] Puter not available, using OpenRouter API");
  }

  // API route (OpenRouter) — for deepmode, puter failure, or puter unavailable
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
