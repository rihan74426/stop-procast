// lib/tos.js — Terms of Service acceptance tracking
// Stored in sessionStorage (per-tab session, not persisted across tabs)
// Signed-in users: also stored in localStorage for persistence across sessions

const SESSION_KEY = "momentum_tos_accepted";
const PERSIST_KEY = "momentum_tos_accepted_v1";
const CURRENT_VERSION = "1.2";

export function isTosAccepted() {
  if (typeof window === "undefined") return false;
  try {
    // Check sessionStorage first (fastest path)
    if (sessionStorage.getItem(SESSION_KEY) === CURRENT_VERSION) return true;
    // Check localStorage (signed-in users who accepted before)
    if (localStorage.getItem(PERSIST_KEY) === CURRENT_VERSION) {
      // Sync to sessionStorage
      sessionStorage.setItem(SESSION_KEY, CURRENT_VERSION);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function acceptTos(persist = false) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, CURRENT_VERSION);
    if (persist) {
      localStorage.setItem(PERSIST_KEY, CURRENT_VERSION);
    }
  } catch {
    /* ignore */
  }
}

export function revokeTos() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PERSIST_KEY);
  } catch {
    /* ignore */
  }
}

export const TOS_VERSION = CURRENT_VERSION;
