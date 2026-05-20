"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useUser, SignInButton, useClerk } from "@clerk/nextjs";
import { useI18n } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/i18n/translations";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/lib/store/projectStore";
import { clearMomentumStorage } from "@/lib/clearStorage";

export function TopBar() {
  const { theme, toggle } = useTheme();
  const { isSignedIn, isLoaded, user } = useUser();
  const { signOut } = useClerk();
  const { t, locale, changeLocale } = useI18n();
  const router = useRouter();
  const [langOpen, setLangOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const langRef = useRef(null);

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

  const handleSignOutConfirmed = async () => {
    setSigningOut(true);
    clearMomentumStorage();
    useProjectStore.setState({ projects: [], hydrated: false });
    await signOut({ redirectUrl: "/" });
    setSigningOut(false);
    setShowSignOutConfirm(false);
  };

  return (
    <>
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
          <span className="font-display font-semibold text-sm tracking-tight text-[var(--text-primary)] block">
            Momentum
          </span>
        </Link>

        <div className="flex-1" />

        {/* Language picker */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="h-8 px-2.5 flex items-center gap-1.5 text-xs font-medium rounded-[var(--r-md)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-all"
            aria-label={t("lang_select")}
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="h-8 px-2.5 flex items-center gap-2 text-xs font-medium rounded-[var(--r-md)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-all"
                title={t("signout_confirm_title")}
              >
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={user.firstName || "User"}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[var(--violet-bg)] flex items-center justify-center text-[10px] font-bold text-[var(--violet-dim)]">
                    {(
                      user?.firstName?.[0] ||
                      user?.emailAddresses?.[0]?.emailAddress?.[0] ||
                      "U"
                    ).toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline">
                  {t("signout_confirm_label")}
                </span>
              </button>
            </div>
          ) : (
            <SignInButton mode="modal">
              <button className="h-8 px-2 sm:px-3 text-xs font-medium rounded-[var(--r-md)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-all whitespace-nowrap">
                <span className="hidden sm:inline">{t("nav_sign_in")}</span>
                <span className="sm:hidden">{t("nav_sign_in_short")}</span>
              </button>
            </SignInButton>
          ))}
      </header>

      {/* Sign-out confirmation modal */}
      <Modal
        open={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        title={t("signout_confirm_title")}
        size="sm"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {t("signout_confirm_desc")}
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => setShowSignOutConfirm(false)}
              disabled={signingOut}
            >
              {t("common_cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={handleSignOutConfirmed}
              loading={signingOut}
            >
              {t("signout_confirm_label")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
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
