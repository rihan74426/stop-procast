"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { LANGUAGES, t as _t } from "./translations";

const I18nContext = createContext({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
  isRTL: false,
});

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("momentum_lang");
    if (stored && LANGUAGES.find((l) => l.code === stored)) {
      setLangState(stored);
    } else {
      // Auto-detect from browser
      const browser = navigator.language?.split("-")[0];
      if (browser && LANGUAGES.find((l) => l.code === browser)) {
        setLangState(browser);
      }
    }
    setMounted(true);
  }, []);

  const setLang = (code) => {
    setLangState(code);
    localStorage.setItem("momentum_lang", code);
    // Set dir for RTL support
    const langObj = LANGUAGES.find((l) => l.code === code);
    document.documentElement.dir = langObj?.rtl ? "rtl" : "ltr";
    document.documentElement.lang = code;
  };

  useEffect(() => {
    if (!mounted) return;
    const langObj = LANGUAGES.find((l) => l.code === lang);
    document.documentElement.dir = langObj?.rtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, mounted]);

  const isRTL = LANGUAGES.find((l) => l.code === lang)?.rtl ?? false;
  const t = (key, fallback) => _t(lang, key, fallback);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isRTL, mounted }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
