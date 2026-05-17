"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useProjectStore } from "@/lib/store/projectStore";
import { claimAnonymousProjects } from "@/lib/persistence";
import { clearMomentumStorage } from "@/lib/clearStorage";
import { resetHydratedSession } from "@/lib/store/projectStore";

/**
 * DataProvider — wraps pages that read project data.
 *
 * Responsibilities:
 * 1. On sign-in:  claim anonymous projects → hydrate from server
 * 2. On sign-out: clear localStorage and reset store
 *
 * Sign-out detection uses isSignedIn state transitions rather than
 * Clerk's addListener (which has an unstable callback signature in v6).
 */
export function DataProvider({ children }) {
  const { isSignedIn, isLoaded, user } = useUser();
  const hydrateFromServer = useProjectStore((s) => s.hydrateFromServer);

  // Track the last known signed-in user ID to detect transitions
  const prevUserIdRef = useRef(null);
  // Prevent double-hydration for the same user session
  const syncedUserIdRef = useRef(null);

  useEffect(() => {
    if (!isLoaded) return;

    const currentUserId = user?.id ?? null;
    const previousUserId = prevUserIdRef.current;

    // ── Sign-out detected ────────────────────────────────────────
    // Transition from a known user → null means sign-out occurred.
    if (previousUserId !== null && currentUserId === null) {
      clearMomentumStorage();
      syncedUserIdRef.current = null;
      // Reset the Zustand store to empty state
      useProjectStore.setState({ projects: [], hydrated: false });
      // Reset session-level hydration guard so next sign-in can hydrate afresh
      resetHydratedSession();
    }

    prevUserIdRef.current = currentUserId;

    // ── Sign-in / hydration ──────────────────────────────────────
    if (!isSignedIn || !currentUserId) return;
    if (syncedUserIdRef.current === currentUserId) return;

    syncedUserIdRef.current = currentUserId;

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
