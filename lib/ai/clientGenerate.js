/**
 * Client-side AI generation orchestrator
 *
 * Routing:
 *   lean / standard  → puter.js (claude-sonnet-4, free & unlimited)
 *   ambitious        → POST /api/generate (OpenRouter, deep mode)
 *
 * Both return a ReadableStream for uniform handling in StepReview.
 */

import { puterGenerate, puterStream, isPuterAvailable } from "./puter";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  buildClarifyPrompt,
  buildReengagePrompt,
} from "./prompts";

// ─── Blueprint generation (streaming) ────────────────────────────────

export async function generateBlueprint({
  idea,
  clarifications,
  scopeLevel,
  profileContext,
}) {
  const isDeepMode = scopeLevel === "ambitious";

  if (!isDeepMode && isPuterAvailable()) {
    // Puter path — free, unlimited, client-side
    try {
      const userPrompt = buildUserPrompt({
        idea,
        clarifications,
        scopeLevel,
        profileContext,
      });
      return await puterStream(SYSTEM_PROMPT, userPrompt);
    } catch (err) {
      console.warn("[AI] Puter failed, falling back to API:", err.message);
      // Fall through to API route
    }
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
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error ?? "Generation failed");
    err.code = data.code;
    err.status = res.status;
    throw err;
  }

  return res.body; // ReadableStream from fetch
}

// ─── Clarify questions (non-streaming) ───────────────────────────────

export async function generateClarifyQuestions(idea) {
  if (isPuterAvailable()) {
    try {
      const text = await puterGenerate(buildClarifyPrompt(idea));
      return text;
    } catch (err) {
      console.warn("[AI] Puter clarify failed, using API:", err.message);
    }
  }

  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "clarify", idea }),
  });
  if (!res.ok) throw new Error("Failed to load questions");
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

  const res = await fetch("/api/reengage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.suggestion ?? null;
}
