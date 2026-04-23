// Pure utility — no "use client", works on both server and client
// Profile is read/written client-side only; buildProfileContext is a pure transform

export const PROFILE_KEY = "momentum_user_profile";

export function loadUserProfile() {
  if (typeof window === "undefined") return getDefaultProfile();
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return getDefaultProfile();
    return { ...getDefaultProfile(), ...JSON.parse(raw) };
  } catch {
    return getDefaultProfile();
  }
}

export function saveUserProfile(profile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getDefaultProfile() {
  return {
    profession: "",
    skills: "",
    experienceLevel: "intermediate",
    responseStyle: "detailed",
    extraContext: "",
  };
}

/**
 * Pure string transform — safe to call anywhere (client or server).
 * The API route receives this as an already-built string in the POST body.
 */
export function buildProfileContext(profile) {
  if (!profile) return "";
  const lines = [];

  if (profile.profession?.trim()) {
    lines.push(`USER PROFILE: The user is a ${profile.profession}.`);
  }
  if (profile.skills?.trim()) {
    lines.push(`SKILLS & EXPERTISE: ${profile.skills}`);
  }
  if (profile.experienceLevel) {
    const levelMap = {
      beginner:
        "a beginner — provide clear step-by-step guidance, avoid jargon",
      intermediate: "an intermediate practitioner who understands fundamentals",
      advanced:
        "an advanced practitioner — skip basics, use technical language freely",
      expert: "an expert — be peer-level, skip fundamentals, focus on nuance",
    };
    lines.push(
      `EXPERIENCE: Treat them as ${
        levelMap[profile.experienceLevel] || profile.experienceLevel
      }`
    );
  }
  if (profile.responseStyle) {
    const styleMap = {
      concise: "Be concise and direct. No filler words.",
      detailed: "Provide detailed, thorough plans with full rationale.",
      friendly: "Use a warm, encouraging tone throughout.",
      technical: "Use precise technical language. Prioritize exactness.",
    };
    lines.push(
      `TONE: ${styleMap[profile.responseStyle] || profile.responseStyle}`
    );
  }
  if (profile.extraContext?.trim()) {
    lines.push(`EXTRA CONTEXT: ${profile.extraContext}`);
  }

  if (lines.length === 0) return "";
  return `\n\nUSER PERSONALIZATION (adapt the plan accordingly):\n${lines.join(
    "\n"
  )}`;
}
