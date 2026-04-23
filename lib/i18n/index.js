"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { translations } from "./translations";
import { DEFAULT_LOCALE, RTL_LOCALES } from "./config";

const I18nContext = createContext(null);

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
    document.documentElement.dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale, mounted]);

  const changeLocale = (l) => {
    if (translations[l]) setLocale(l);
  };

  /** Translate a key, replacing {{var}} placeholders */
  const t = (key, vars = {}) => {
    const dict = translations[locale] || translations[DEFAULT_LOCALE];
    let str = dict[key] || translations[DEFAULT_LOCALE][key] || key;
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
    });
    return str;
  };

  return (
    <I18nContext.Provider
      value={{ locale, changeLocale, t, isRTL: RTL_LOCALES.includes(locale) }}
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
