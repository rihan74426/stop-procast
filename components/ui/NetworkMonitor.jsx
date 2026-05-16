"use client";

import { useEffect, useRef } from "react";
import { useToastStore } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";

export function NetworkMonitor() {
  const offlineToastId = useRef(null);
  const show = useToastStore((s) => s.show);
  const dismiss = useToastStore((s) => s.dismiss);
  const { t } = useI18n();

  useEffect(() => {
    const handleOffline = () => {
      if (offlineToastId.current) return;
      offlineToastId.current = show(t("network_offline"), {
        type: "warn",
        duration: 0,
      });
    };

    const handleOnline = () => {
      if (offlineToastId.current) {
        dismiss(offlineToastId.current);
        offlineToastId.current = null;
      }
      show(t("network_online"), { type: "success" });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    if (!navigator.onLine) handleOffline();

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [show, dismiss, t]);

  return null;
}
