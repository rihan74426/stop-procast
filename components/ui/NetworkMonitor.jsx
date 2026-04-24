"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/lib/toast";

export function NetworkMonitor() {
  const offlineToastId = useRef(null);

  useEffect(() => {
    const handleOffline = () => {
      offlineToastId.current = toast.error(
        "No internet connection — changes will sync when you're back online.",
        { duration: 0 }
      );
    };

    const handleOnline = () => {
      if (offlineToastId.current) {
        toast.dismiss(offlineToastId.current);
        offlineToastId.current = null;
      }
      toast.success("Back online — syncing your changes.");
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Check initial state
    if (!navigator.onLine) handleOffline();

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
