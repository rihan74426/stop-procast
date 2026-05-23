"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { translations } from "./translations";
import { DEFAULT_LOCALE, RTL_LOCALES } from "./config";

const I18nContext = createContext(null);

// Locales that need a layout-level class on <html>.
// NOTE: These classes NO LONGER control fonts — unicode-range in
// globals.css handles font selection automatically per character.
// These classes only control layout adjustments (letter-spacing,
// RTL direction) that differ per script.
const LOCALE_CLASS_MAP = {
  bn: "lang-bn", // Bengali heading letter-spacing tweak
  ar: "lang-ar", // Arabic heading letter-spacing reset + RTL dir
};

const ALL_LOCALE_CLASSES = Object.values(LOCALE_CLASS_MAP);

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("momentum_locale");
    if (stored && translations[stored]) {
      setLocale(stored);
    } else {
      const browser = navigator.language?.slice(0, 2);
      if (browser && translations[browser]) setLocale(browser);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem("momentum_locale", locale);

    // ── RTL direction ──────────────────────────────────────────────
    document.documentElement.dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
    document.documentElement.lang = locale;

    // ── Layout class ───────────────────────────────────────────────
    // Remove previous locale class, apply new one if needed.
    // Fonts are NOT controlled here — they are resolved automatically
    // by the browser via unicode-range @font-face in globals.css.
    document.documentElement.classList.remove(...ALL_LOCALE_CLASSES);
    const localeClass = LOCALE_CLASS_MAP[locale];
    if (localeClass) {
      document.documentElement.classList.add(localeClass);
    }
  }, [locale, mounted]);

  const changeLocale = (l) => {
    if (translations[l]) setLocale(l);
  };

  const t = (key, vars = {}) => {
    const dict = translations[locale] || translations[DEFAULT_LOCALE];
    let str = dict[key] || translations[DEFAULT_LOCALE]?.[key] || key;
    if (vars && typeof vars === "object") {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
      });
    }
    return str;
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        changeLocale,
        t,
        isRTL: RTL_LOCALES.includes(locale),
        mounted,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
