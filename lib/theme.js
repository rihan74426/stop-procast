/**
 * lib/theme.js — REPLACE with this version
 *
 * Key fix: eliminates the visibility:hidden flash that causes CLS.
 *
 * Strategy: inject a tiny inline script in <head> (before React hydrates)
 * that reads localStorage and sets the class immediately — zero flash.
 * Then React takes over cleanly.
 */

"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "dark", toggle: () => {} });

/**
 * Inline script to put in layout.js <head> — add this as a <script> tag:
 *
 * <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
 *
 * This runs BEFORE React, eliminating the theme flash entirely.
 */
export const THEME_SCRIPT = `(function(){
  try {
    var stored = localStorage.getItem("sp_theme");
    var dark = stored 
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  } catch(e) {}
})();`;

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read the theme that the inline script already applied
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("sp_theme", theme);
  }, [theme, mounted]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // NO more visibility:hidden — the inline script handles it
  // Children render immediately without flash
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Add to layout.js <head>, BEFORE any other scripts:
 *
 * import { THEME_SCRIPT } from "@/lib/theme";
 *
 * <head>
 *   <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
 *   ... rest of head
 * </head>
 *
 * This is the industry-standard approach used by Vercel, Linear, etc.
 */
