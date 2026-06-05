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
import {
  FiCompass,
  FiHome,
  FiSun,
  FiMoon,
  FiChevronDown,
} from "react-icons/fi";

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
      <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex items-center px-3 sm:px-4 gap-1.5 sm:gap-2 sticky top-0 z-30 min-w-0">
        {/* Home button */}
        <Link
          href="/"
          aria-label="Home"
          title={t("nav_home")}
          className="h-9 w-9 flex items-center justify-center rounded-[var(--r-md)] border border-[var(--border)] transition-colors shrink-0"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-subtle)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <FiHome size={15} />
        </Link>

        {/* Brand logo */}
        <Link
          href={isSignedIn ? "/dashboard" : "/"}
          className="flex items-center gap-1.5 sm:gap-2 mr-1 sm:mr-2 shrink-0"
        >
          <div className="h-7 w-7 rounded-[var(--r-md)] overflow-hidden flex items-center justify-center shrink-0">
            <Image
              src="/favicon.png"
              alt="Momentum"
              width={28}
              height={28}
              className="object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              priority
            />
          </div>
          <span
            className="font-display font-semibold text-sm tracking-tight hidden xs:block sm:block"
            style={{ color: "var(--text-primary)" }}
          >
            Momentum
          </span>
        </Link>

        <div className="flex-1 min-w-0" />

        {/* Explore link */}
        <Link
          href="/explore"
          className="h-9 px-2 sm:px-2.5 flex items-center gap-2 text-xs font-medium rounded-[var(--r-md)] border border-[var(--border)] transition-all mr-1 shrink-0"
          style={{ color: "var(--text-secondary)" }}
          aria-label={t("nav_explore")}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-subtle)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <FiCompass size={14} />
          <span className="hidden md:inline">{t("nav_explore")}</span>
        </Link>

        {/* Language picker */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="h-9 px-2 sm:px-2.5 flex items-center gap-1 sm:gap-1.5 text-xs font-medium rounded-[var(--r-md)] border border-[var(--border)] transition-all"
            style={{ color: "var(--text-secondary)" }}
            aria-label={t("lang_select")}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-subtle)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <span className="text-base leading-none">{currentLang.flag}</span>
            <span className="hidden md:inline">{currentLang.label}</span>
            <FiChevronDown
              size={12}
              className="hidden sm:block transition-transform duration-150"
              style={{
                transform: langOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {langOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-44 rounded-[var(--r-lg)] border overflow-hidden z-50"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-elevated)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLocale(lang.code);
                    setLangOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors"
                  style={{
                    background:
                      locale === lang.code ? "var(--violet-bg)" : "transparent",
                    color:
                      locale === lang.code
                        ? "var(--violet-dim)"
                        : "var(--text-secondary)",
                    fontWeight: locale === lang.code ? 500 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (locale !== lang.code) {
                      e.currentTarget.style.background = "var(--bg-subtle)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (locale !== lang.code) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.label}</span>
                  {locale === lang.code && (
                    <span
                      className="ml-auto"
                      style={{ color: "var(--violet)" }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="h-9 w-9 flex items-center justify-center rounded-[var(--r-md)] border border-[var(--border)] transition-all shrink-0"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-subtle)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          {theme === "dark" ? <FiSun size={15} /> : <FiMoon size={15} />}
        </button>

        {/* Auth */}
        {isLoaded &&
          (isSignedIn ? (
            <button
              onClick={() => setShowSignOutConfirm(true)}
              className="h-9 px-2 sm:px-2.5 flex items-center gap-1.5 sm:gap-2 text-xs font-medium rounded-[var(--r-md)] border border-[var(--border)] transition-all shrink-0"
              style={{ color: "var(--text-secondary)" }}
              title={t("signout_confirm_title")}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-subtle)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.firstName || "User"}
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{
                    background: "var(--violet-bg)",
                    color: "var(--violet-dim)",
                  }}
                >
                  {(
                    user?.firstName?.[0] ||
                    user?.emailAddresses?.[0]?.emailAddress?.[0] ||
                    "U"
                  ).toUpperCase()}
                </div>
              )}
              <span className="hidden sm:inline truncate max-w-[80px]">
                {user?.firstName || t("signout_confirm_label")}
              </span>
            </button>
          ) : (
            <SignInButton mode="modal">
              <button
                className="h-9 px-2 sm:px-3 text-xs font-medium rounded-[var(--r-md)] border border-[var(--border)] transition-all whitespace-nowrap shrink-0"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-subtle)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <span className="hidden sm:inline">{t("nav_sign_in")}</span>
                <span className="sm:hidden">Sign in</span>
              </button>
            </SignInButton>
          ))}
      </header>

      {/* Sign-out confirmation */}
      <Modal
        open={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        title={t("signout_confirm_title")}
        size="sm"
      >
        <div className="flex flex-col gap-5">
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
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
