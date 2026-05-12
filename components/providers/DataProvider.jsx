"use client";

import { useEffect, useRef } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useProjectStore } from "@/lib/store/projectStore";
import { claimAnonymousProjects } from "@/lib/persistence";

/**
 * DataProvider — wraps pages that read project data.
 *
 * Responsibilities:
 * 1. On sign-in:  claim anonymous projects → hydrate from server
 * 2. On sign-out: clear localStorage so the next session starts clean
 *
 * Sign-out clearing is safe because:
 *  - Signed-in users have their data in MongoDB (not just localStorage)
 *  - Anonymous sessions each generate a fresh sessionId on next visit
 *  - We only clear Momentum-specific keys, not all of localStorage
 */

/** Keys managed by Momentum that should be wiped on sign-out */
const MOMENTUM_STORAGE_KEYS = [
  "stopprocast_projects_v1",
  "momentum_user_profile",
  "momentum_locale",
  "sp_theme",
  "sp_save_nudge_seen",
  "momentum_ai_model",
  "momentum_ai_usage",
  "momentum_session_id",
  "momentum_reminder_prefs",
  "puter.app.id",
  "puter.auth.token",
];

function clearMomentumStorage() {
  if (typeof window === "undefined") return;
  try {
    MOMENTUM_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    // Also clear any versioned project keys (stopprocast_projects_v2, etc.)
    Object.keys(localStorage)
      .filter((k) => k.startsWith("stopprocast_projects_"))
      .forEach((k) => localStorage.removeItem(k));
    console.log("[DataProvider] localStorage cleared on sign-out");
  } catch {
    // localStorage might be blocked in some environments — ignore
  }
}

export function DataProvider({ children }) {
  const { isSignedIn, isLoaded, user } = useUser();
  const { addListener } = useClerk();
  const hydrated = useProjectStore((s) => s.hydrated);
  const hydrateFromServer = useProjectStore((s) => s.hydrateFromServer);
  const syncedUserId = useRef(null);

  // ── Listen for Clerk sign-out and clear storage ─────────────────
  useEffect(() => {
    // addListener returns an unsubscribe function
    const unsubscribe = addListener(({ user: clerkUser }) => {
      // When user transitions from signed-in to null → sign-out occurred
      if (!clerkUser && syncedUserId.current !== null) {
        clearMomentumStorage();
        syncedUserId.current = null;
        // Reset the Zustand store to empty state
        useProjectStore.setState({ projects: [], hydrated: false });
      }
    });
    return () => unsubscribe();
  }, [addListener]);

  // ── Hydrate from server on sign-in ──────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user?.id) return;
    if (syncedUserId.current === user.id) return;

    syncedUserId.current = user.id;

    (async () => {
      try {
        const { count } = await claimAnonymousProjects();
        if (count > 0) {
          console.log(`[DataProvider] claimed ${count} anonymous projects`);
        }
      } catch (err) {
        console.warn("[DataProvider] claim failed:", err.message);
      } finally {
        hydrateFromServer();
      }
    })();
  }, [isLoaded, isSignedIn, user?.id, hydrateFromServer]);

  return <>{children}</>;
}
