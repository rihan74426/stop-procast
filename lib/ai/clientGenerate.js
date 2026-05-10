"use client";

/**
 * lib/ai/clientGenerate.js — Client-side AI generation orchestrator
 *
 * "use client" is required: this module calls window.puter and must NEVER
 * be bundled into a server path. The directive prevents Next.js from
 * importing it in API routes or server components.
 *
 * Puter is imported lazily (dynamic import inside the helper) so that
 * the module graph itself never pulls window-touching code into SSR.
 *
 * Routing:
 *   lean / standard  → puter.js first (free, client-side), fallback to API
 *   ambitious        → always POST /api/generate (OpenRouter, server-side)
 */

import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  buildClarifyPrompt,
  buildReengagePrompt,
} from "./prompts";
import { notifyAIProvider, notifyAIError } from "./aiStatus";

// ─── Lazy puter loader ────────────────────────────────────────────────
// Importing puter.js at module-level would pull window access into the
// module graph and crash SSR. Dynamic import keeps it client-only.

let _puterModule = null;
async function getPuterModule() {
  if (_puterModule) return _puterModule;
  _puterModule = await import("./puter");
  return _puterModule;
}

// Synchronous availability check — safe to call before the dynamic import
// resolves because isPuterAvailable only reads window.puter (set by the
// CDN script) and never references the puter.js module exports.
function checkPuterAvailable() {
  if (typeof window === "undefined") return false;
  return typeof window.puter?.ai?.chat === "function";
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

  if (!isDeepMode && checkPuterAvailable()) {
    try {
      notifyAIProvider("puter");
      const { puterStream } = await getPuterModule();
      const userPrompt = buildUserPrompt({
        idea,
        clarifications,
        scopeLevel,
        profileContext,
      });
      const stream = await puterStream(SYSTEM_PROMPT, userPrompt);
      return stream;
    } catch (err) {
      console.warn("[AI] Puter blueprint failed, falling back:", err.message);
      notifyAIError(
        "puter",
        err.message?.includes("timed out") ? "timeout" : "empty"
      );
      notifyAIProvider("openrouter", "fallback");
      // fall through to API route
    }
  } else if (isDeepMode) {
    notifyAIProvider("openrouter", "deepmode");
  } else {
    console.info("[AI] Puter not available, using OpenRouter API");
  }

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
  if (checkPuterAvailable()) {
    try {
      const { puterGenerate } = await getPuterModule();
      return await puterGenerate(buildClarifyPrompt(idea));
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
  if (checkPuterAvailable()) {
    try {
      const { puterGenerate } = await getPuterModule();
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
