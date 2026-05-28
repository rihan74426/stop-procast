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

  // Try Puter first (client-side) for every scope.
  try {
    const puter = await getPuterModule();
    const available =
      typeof puter?.isPuterAvailable === "function"
        ? puter.isPuterAvailable()
        : checkPuterAvailable();

    if (available) {
      try {
        notifyAIProvider("puter");

        // Prefer a streaming API if available
        if (typeof puter.puterStream === "function") {
          const stream = await puter.puterStream(systemPrompt, userPrompt);
          return stream;
        }

        // If only a non-stream generator exists, call it and wrap into a stream
        if (typeof puter.puterGenerate === "function") {
          const fullText = await puter.puterGenerate(
            `${systemPrompt ? systemPrompt + "\n\n" : ""}${userPrompt}`
          );
          // simple stream wrapper
          const encoder = new TextEncoder();
          const CHUNK = 24;
          return new ReadableStream({
            start(controller) {
              let i = 0;
              function push() {
                if (i >= fullText.length) {
                  controller.close();
                  return;
                }
                controller.enqueue(
                  encoder.encode(fullText.slice(i, i + CHUNK))
                );
                i += CHUNK;
                setTimeout(push, 8);
              }
              push();
            },
            cancel() {
              /* noop */
            },
          });
        }

        // If module doesn't provide expected APIs, treat as unavailable
        console.warn("[AI] puter module loaded but has no stream/generate API");
      } catch (err) {
        console.warn(
          "[AI] Puter blueprint failed, falling back:",
          err?.message
        );
        notifyAIError(
          "puter",
          err.message?.includes("timed out") ? "timeout" : "error"
        );
      }
    }
  } catch (importErr) {
    console.warn("[AI] Failed to load puter module:", importErr?.message);
  }

  // Notify server provider (deep mode or fallback). Server will choose OpenRouter / configured model.
  notifyAIProvider(
    isDeepMode ? "openrouter" : "openrouter",
    isDeepMode ? "deepmode" : "fallback"
  );

  // Final fallback — server-side generate route
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
  // Prefer puter if available, otherwise call server API
  try {
    const puter = await getPuterModule();
    const available =
      typeof puter?.isPuterAvailable === "function"
        ? puter.isPuterAvailable()
        : checkPuterAvailable();
    if (available) {
      try {
        const { puterGenerate } = puter;
        return await puterGenerate(buildClarifyPrompt(idea, locale));
      } catch (err) {
        console.warn("[AI] Puter clarify failed, using API:", err.message);
      }
    }
  } catch (e) {
    console.warn("[AI] Failed to load puter module for clarify:", e?.message);
  }

  const res = await callGenerateAPI({ type: "clarify", idea, locale });
  const data = await res.json();
  return data.questions ?? "[]";
}

// ─── Re-engage suggestion ─────────────────────────────────────────────

export async function generateReengage(project, locale = "en") {
  // Prefer puter if available, otherwise call server API
  try {
    const puter = await getPuterModule();
    const available =
      typeof puter?.isPuterAvailable === "function"
        ? puter.isPuterAvailable()
        : checkPuterAvailable();
    if (available) {
      try {
        const { puterGenerate } = puter;
        return await puterGenerate(buildReengagePrompt(project, locale));
      } catch (err) {
        console.warn("[AI] Puter reengage failed, using API:", err.message);
      }
    }
  } catch (e) {
    console.warn("[AI] Failed to load puter module for reengage:", e?.message);
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
