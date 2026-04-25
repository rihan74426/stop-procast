// Generate and manage anonymous session IDs
// Stored in localStorage for guest users, replaced with userId on login

const SESSION_KEY = "momentum_session_id";

export function getSessionId() {
  if (typeof window === "undefined") return null;

  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function clearSessionId() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

function generateSessionId() {
  // Simple random ID - not cryptographically secure but fine for tracking
  return `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
