"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { useI18n } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/i18n/translations";

export function TopBar() {
  const { theme, toggle } = useTheme();
  const { isSignedIn, isLoaded } = useUser();
  const { t, locale, changeLocale } = useI18n();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  return (
    <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex items-center px-3 sm:px-4 gap-2 sm:gap-3 sticky top-0 z-30">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mr-2 shrink-0">
        <div className="h-7 w-7 rounded-[var(--r-md)] overflow-hidden flex items-center justify-center">
          <Image
            src="/favicon.png"
            alt="Momentum"
            width={28}
            height={40}
            className="object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
        <span className="font-display font-semibold text-sm tracking-tight text-[var(--text-primary)] hidden sm:block">
          Momentum
        </span>
      </Link>

      <div className="flex-1" />

      {/* Language picker */}
      <div ref={langRef} className="relative">
        <button
          onClick={() => setLangOpen((o) => !o)}
          className="h-8 px-2.5 flex items-center gap-1.5 text-xs font-medium rounded-[var(--r-md)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-all"
          aria-label="Change language"
        >
          <span>{currentLang.flag}</span>
          <span className="hidden sm:inline">{currentLang.label}</span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className={`transition-transform duration-150 ${
              langOpen ? "rotate-180" : ""
            }`}
          >
            <path
              d="M2 3.5l3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {langOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-44 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] overflow-hidden z-50">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  changeLocale(lang.code);
                  setLangOpen(false);
                }}
                className={[
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
                  locale === lang.code
                    ? "bg-[var(--violet-bg)] text-[var(--violet-dim)] font-medium"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]",
                ].join(" ")}
              >
                <span className="text-base">{lang.flag}</span>
                <span>{lang.label}</span>
                {locale === lang.code && (
                  <span className="ml-auto text-[var(--violet)]">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </Button>

      {/* Auth */}
      {isLoaded &&
        (isSignedIn ? (
          <UserButton afterSignOutUrl="/" />
        ) : (
          <SignInButton mode="modal">
            <button className="h-8 px-2 sm:px-3 text-xs font-medium rounded-[var(--r-md)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-all whitespace-nowrap">
              <span className="hidden sm:inline">{t("nav_sign_in")}</span>
              <span className="sm:hidden">{t("nav_sign_in_short")}</span>
            </button>
          </SignInButton>
        ))}
    </header>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M11.54 4.46l-1.41 1.41M4.95 11.54l-1.41 1.41"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M13.5 9A6 6 0 0 1 7 2.5a6 6 0 1 0 6.5 6.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
