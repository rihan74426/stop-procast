/**
 * AI Status notifications
 * Shows user-friendly toasts when switching between AI providers
 */

import { toast } from "@/lib/toast";

let _lastProvider = null;
let _statusToastId = null;

export function notifyAIProvider(provider, reason = null) {
  // Dismiss previous status toast
  if (_statusToastId) {
    toast.dismiss(_statusToastId);
    _statusToastId = null;
  }

  if (provider === _lastProvider) return;
  _lastProvider = provider;

  if (provider === "puter" && reason === "fallback") {
    _statusToastId = toast.info("Switched to free AI — primary AI was busy.", {
      duration: 4000,
    });
  } else if (provider === "openrouter" && reason === "fallback") {
    _statusToastId = toast.warn(
      "Free AI unavailable — using backup AI. May be slightly slower.",
      { duration: 5000 },
    );
  } else if (provider === "openrouter" && reason === "deepmode") {
    _statusToastId = toast.info(
      "Using advanced AI for your ambitious plan 🔬",
      { duration: 3000 },
    );
  }
}

export function notifyAIError(provider, errorType) {
  const messages = {
    timeout: `AI (${provider}) timed out — trying backup...`,
    ratelimit: "AI rate limit hit — retrying in a moment...",
    quota: "AI quota reached for today. Trying alternative...",
    empty: "AI returned empty response — retrying...",
  };
  toast.warn(messages[errorType] ?? `AI issue (${provider}) — switching...`, {
    duration: 4000,
  });
}

export function resetAIProvider() {
  _lastProvider = null;
}
