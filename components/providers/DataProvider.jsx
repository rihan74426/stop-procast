"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useProjectStore } from "@/lib/store/projectStore";
import { claimAnonymousProjects } from "@/lib/persistence";

/**
 * Wrap every page that reads project data.
 *
 * Sign-in flow:
 *   1. claimAnonymousProjects() — links sessionId docs to userId in MongoDB
 *   2. hydrateFromServer()      — merges remote + local into the store
 *
 * Fixes:
 *   - syncStarted ref is reset when user signs out so re-sign-in works
 *   - Avoids race between hydrated state check and syncStarted ref
 *   - Mounts only once per sign-in session
 */
export function DataProvider({ children }) {
  const { isSignedIn, isLoaded, user } = useUser();
  const hydrated = useProjectStore((s) => s.hydrated);
  const hydrateFromServer = useProjectStore((s) => s.hydrateFromServer);
  // Use userId as the key so this re-runs if user changes (sign out → sign in)
  const syncedUserId = useRef(null);

  useEffect(() => {
    if (!isLoaded) return;

    // Not signed in — nothing to sync
    if (!isSignedIn || !user?.id) return;

    // Already synced for this user in this session
    if (syncedUserId.current === user.id) return;

    // Mark as started for this userId to prevent duplicate calls
    syncedUserId.current = user.id;

    (async () => {
      try {
        const { count } = await claimAnonymousProjects();
        if (count > 0) {
          console.log(`[DataProvider] claimed ${count} anonymous projects`);
        }
      } catch (err) {
        // Non-fatal — hydrate anyway
        console.warn("[DataProvider] claim failed:", err.message);
      } finally {
        hydrateFromServer();
      }
    })();
  }, [isLoaded, isSignedIn, user?.id, hydrateFromServer]);

  return <>{children}</>;
}
