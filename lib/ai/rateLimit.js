// Client-side daily rate limit tracker
// Stored in localStorage, resets at midnight UTC

const KEY = "momentum_ai_usage";
const LIMITS = {
  generate: 5, // blueprint generation (expensive streaming call)
  clarify: 10, // clarify questions
  reengage: 20, // re-engage prompts (cheap, short)
};

function getStore() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Reset if it's a new day (UTC)
    const today = new Date().toISOString().split("T")[0];
    if (data.date !== today) return null;
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

export function getRemainingRequests(type) {
  const limit = LIMITS[type] ?? 10;
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
  return {
    generate: {
      used: store.generate ?? 0,
      limit: LIMITS.generate,
      remaining: getRemainingRequests("generate"),
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
