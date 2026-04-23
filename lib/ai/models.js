// Model preferences stored in localStorage
// Names shown to users are friendly names only — no provider references

export const AI_MODELS = [
  {
    id: "model1",
    name: "Balanced",
    description: "Fast and well-rounded. Great for most project types.",
    badge: "⚡ Fast",
    badgeColor: "emerald",
  },
  {
    id: "model2",
    name: "Detailed",
    description: "Strong reasoning. Best for complex, multi-phase projects.",
    badge: "🧠 Smart",
    badgeColor: "violet",
  },
  {
    id: "model3",
    name: "Comprehensive",
    description: "Most thorough. Ideal for ambitious long-term plans.",
    badge: "🎯 Deep",
    badgeColor: "amber",
  },
];

export const DEFAULT_MODEL_ID = "model1";
export const MODEL_PREF_KEY = "momentum_ai_model";

export function getStoredModel() {
  if (typeof window === "undefined") return DEFAULT_MODEL_ID;
  return localStorage.getItem(MODEL_PREF_KEY) || DEFAULT_MODEL_ID;
}

export function setStoredModel(id) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODEL_PREF_KEY, id);
}
