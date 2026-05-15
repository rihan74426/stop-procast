"use client";

/**
 * lib/ai/clientGenerate.js — Client-side AI generation orchestrator
 *
 * "use client" is required: this module calls window.puter and must NEVER
 * be bundled into a server path.
 */

import {
  buildSystemPrompt,
  buildUserPrompt,
  buildClarifyPrompt,
  buildReengagePrompt,
} from "./prompts";
import { notifyAIProvider, notifyAIError } from "./aiStatus";

let _puterModule = null;
async function getPuterModule() {
  if (_puterModule) return _puterModule;
  _puterModule = await import("./puter");
  return _puterModule;
}

function checkPuterAvailable() {
  if (typeof window === "undefined") return false;
  return typeof window.puter?.ai?.chat === "function";
}

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
  locale = "en",
}) {
  const isDeepMode = scopeLevel === "ambitious";
  const systemPrompt = buildSystemPrompt(locale);
  const userPrompt = buildUserPrompt({
    idea,
    clarifications,
    scopeLevel,
    profileContext,
    locale,
  });

  if (!isDeepMode && checkPuterAvailable()) {
    try {
      notifyAIProvider("puter");
      const { puterStream } = await getPuterModule();
      const stream = await puterStream(systemPrompt, userPrompt);
      return stream;
    } catch (err) {
      console.warn("[AI] Puter blueprint failed, falling back:", err.message);
      notifyAIError(
        "puter",
        err.message?.includes("timed out") ? "timeout" : "empty"
      );
      notifyAIProvider("openrouter", "fallback");
    }
  } else if (isDeepMode) {
    notifyAIProvider("openrouter", "deepmode");
  }

  const res = await callGenerateAPI({
    type: "generate",
    idea,
    clarifications,
    scopeLevel,
    profileContext,
    locale,
  });
  if (!res.body) throw new Error("AI returned empty stream. Please try again.");
  return res.body;
}

// ─── Clarify questions ────────────────────────────────────────────────

export async function generateClarifyQuestions(idea, locale = "en") {
  if (checkPuterAvailable()) {
    try {
      const { puterGenerate } = await getPuterModule();
      return await puterGenerate(buildClarifyPrompt(idea, locale));
    } catch (err) {
      console.warn("[AI] Puter clarify failed, using API:", err.message);
    }
  }
  const res = await callGenerateAPI({ type: "clarify", idea, locale });
  const data = await res.json();
  return data.questions ?? "[]";
}

// ─── Re-engage suggestion ─────────────────────────────────────────────

export async function generateReengage(project, locale = "en") {
  if (checkPuterAvailable()) {
    try {
      const { puterGenerate } = await getPuterModule();
      return await puterGenerate(buildReengagePrompt(project, locale));
    } catch (err) {
      console.warn("[AI] Puter reengage failed, using API:", err.message);
    }
  }
  try {
    const res = await fetch("/api/reengage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project, locale }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.suggestion ?? null;
  } catch {
    return null;
  }
}
