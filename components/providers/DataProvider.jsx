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
 */
export function DataProvider({ children }) {
  const { isSignedIn, isLoaded } = useUser();
  const hydrated = useProjectStore((s) => s.hydrated);
  const hydrateFromServer = useProjectStore((s) => s.hydrateFromServer);
  const syncStarted = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hydrated || syncStarted.current) return;
    syncStarted.current = true;

    (async () => {
      try {
        const { count } = await claimAnonymousProjects();
        if (count > 0) {
          console.log(`[DataProvider] claimed ${count} anonymous projects`);
        }
      } catch {
        // non-fatal
      } finally {
        hydrateFromServer();
      }
    })();
  }, [isLoaded, isSignedIn, hydrated, hydrateFromServer]);

  return <>{children}</>;
}
