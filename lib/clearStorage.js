/**
 * lib/clearStorage.js
 *
 * Single source of truth for all Momentum-managed localStorage keys.
 * Import this in DataProvider and Topbar instead of duplicating the list.
 */

export const MOMENTUM_STORAGE_KEYS = [
  "stopprocast_projects_v1",
  "momentum_user_profile",
  "momentum_locale",
  "sp_theme",
  "sp_save_nudge_seen",
  "momentum_ai_model",
  "momentum_ai_usage",
  "momentum_session_id",
  "momentum_reminder_prefs",
  "momentum_feedback_seen",
  "puter.app.id",
  "puter.auth.token",
];

/**
 * Clears all Momentum-specific localStorage keys.
 * Safe to call on sign-out — preserves non-Momentum browser data.
 */
export function clearMomentumStorage() {
  if (typeof window === "undefined") return;
  try {
    MOMENTUM_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    // Also clear any versioned project keys (stopprocast_projects_v2, v3, etc.)
    Object.keys(localStorage)
      .filter((k) => k.startsWith("stopprocast_projects_"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // localStorage may be blocked in some environments — ignore
  }
}
