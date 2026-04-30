// Client-side daily rate limit tracker
// Anonymous users: 1 generate/day
// Signed-in users: 5 generate/day (enforced server-side too)
// Resets at midnight UTC

const KEY = "momentum_ai_usage";

const LIMITS = {
  generate_anon: 1, // anonymous — 1 blueprint per day
  generate_authed: 5, // signed-in — 5 per day
  clarify: 10,
  reengage: 20,
};

function getStore() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const today = new Date().toISOString().split("T")[0];
    if (data.date !== today) return null; // new day → reset
    return data;
  } catch {
    return null;
  }
}

function saveStore(data) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function isSignedIn() {
  // Clerk sets __clerk_db_jwt in localStorage when signed in
  if (typeof window === "undefined") return false;
  try {
    return Object.keys(localStorage).some(
      (k) => k.startsWith("__clerk") || k.startsWith("clerk-")
    );
  } catch {
    return false;
  }
}

function getLimit(type) {
  if (type === "generate") {
    return isSignedIn() ? LIMITS.generate_authed : LIMITS.generate_anon;
  }
  return LIMITS[type] ?? 10;
}

export function getRemainingRequests(type) {
  const limit = getLimit(type);
  const store = getStore();
  if (!store) return limit;
  const used = store[type] ?? 0;
  return Math.max(0, limit - used);
}

export function canMakeRequest(type) {
  return getRemainingRequests(type) > 0;
}

export function recordRequest(type) {
  const store = getStore() ?? { date: getToday() };
  store[type] = (store[type] ?? 0) + 1;
  saveStore(store);
}

export function getUsageInfo() {
  const store = getStore() ?? { date: getToday() };
  const genLimit = getLimit("generate");
  return {
    generate: {
      used: store.generate ?? 0,
      limit: genLimit,
      remaining: getRemainingRequests("generate"),
      isAnon: !isSignedIn(),
    },
    clarify: {
      used: store.clarify ?? 0,
      limit: LIMITS.clarify,
      remaining: getRemainingRequests("clarify"),
    },
    reengage: {
      used: store.reengage ?? 0,
      limit: LIMITS.reengage,
      remaining: getRemainingRequests("reengage"),
    },
  };
}
