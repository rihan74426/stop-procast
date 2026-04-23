"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { useI18n } from "@/lib/i18n/context";

export function TopBar() {
  const { theme, toggle } = useTheme();
  const { isSignedIn, isLoaded } = useUser();
  const { t } = useI18n();

  return (
    <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex items-center px-3 sm:px-4 gap-2 sm:gap-3 sticky top-0 z-30">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mr-2 shrink-0">
        <div className="h-7 w-7 rounded-[var(--r-md)] overflow-hidden bg-[var(--violet)] flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="Momentum"
            width={28}
            height={28}
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
