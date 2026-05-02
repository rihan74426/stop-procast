"use client";

import { useEffect, useRef } from "react";
import { useToastStore } from "@/lib/toast";

export function NetworkMonitor() {
  const offlineToastId = useRef(null);
  const show = useToastStore((s) => s.show);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const handleOffline = () => {
      if (offlineToastId.current) return; // already showing
      // Use 'warn' instead of 'error' so the "Report this issue" link
      // doesn't appear — going offline is expected, not a bug
      offlineToastId.current = show(
        "No internet connection — changes will sync when you're back online.",
        { type: "warn", duration: 0 }
      );
    };

    const handleOnline = () => {
      if (offlineToastId.current) {
        dismiss(offlineToastId.current);
        offlineToastId.current = null;
      }
      show("Back online — syncing your changes.", { type: "success" });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Check initial state
    if (!navigator.onLine) handleOffline();

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [show, dismiss]);

  return null;
}
