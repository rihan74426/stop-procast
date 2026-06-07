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
 * 3. Exposes forceRefresh on window for post-acquire re-sync
 */
export function DataProvider({ children }) {
  const { isSignedIn, isLoaded, user } = useUser();
  const hydrateFromServer = useProjectStore((s) => s.hydrateFromServer);

  const prevUserIdRef = useRef(null);
  const syncedUserIdRef = useRef(null);

  // Load local projects immediately on mount
  useEffect(() => {
    useProjectStore.getState().loadLocal();
  }, []);

  // Expose a global force-refresh so AcquirePanel can trigger re-sync
  useEffect(() => {
    window.__momentumRefresh = () => {
      syncedUserIdRef.current = null;
      resetHydratedSession();
      hydrateFromServer();
    };
    return () => {
      delete window.__momentumRefresh;
    };
  }, [hydrateFromServer]);

  useEffect(() => {
    if (!isLoaded) return;

    const currentUserId = user?.id ?? null;
    const previousUserId = prevUserIdRef.current;

    // Sign-out detected
    if (previousUserId !== null && currentUserId === null) {
      clearMomentumStorage();
      syncedUserIdRef.current = null;
      useProjectStore.setState({ projects: [], hydrated: false });
      resetHydratedSession();
    }

    prevUserIdRef.current = currentUserId;

    // Sign-in / hydration
    if (!isSignedIn || !currentUserId) return;
    if (syncedUserIdRef.current === currentUserId) return;

    syncedUserIdRef.current = currentUserId;

    const timer = setTimeout(async () => {
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
    }, 100);

    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, user?.id, hydrateFromServer]);

  return <>{children}</>;
}
