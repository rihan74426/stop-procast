"use client";

import { useEffect } from "react";

export function PuterLoader({ appId, authToken }) {
  useEffect(() => {
    if (!appId || !authToken) return;

    // Seed credentials
    try {
      if (!localStorage.getItem("puter.app.id")) {
        localStorage.setItem("puter.app.id", appId);
      }
      if (!localStorage.getItem("puter.auth.token")) {
        localStorage.setItem("puter.auth.token", authToken);
      }
    } catch {}

    // Load puter.js only after page is interactive
    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount (dev only — doesn't affect prod)
      try {
        document.body.removeChild(script);
      } catch {}
    };
  }, [appId, authToken]);

  return null;
}
