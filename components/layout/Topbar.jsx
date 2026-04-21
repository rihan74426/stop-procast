"use client";

import Link from "next/link";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";

export function TopBar() {
  const { theme, toggle } = useTheme();
  const { isSignedIn, isLoaded } = useUser();

  return (
    <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex items-center px-4 gap-3 sticky top-0 z-30">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mr-2">
        <div className="h-7 w-7 rounded-[var(--r-md)] bg-[var(--violet)] flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2 7h10M7 2l5 5-5 5"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="font-display font-semibold text-sm tracking-tight text-[var(--text-primary)]">
          StopProcast
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

      {/* Auth — sign in prompt or avatar */}
      {isLoaded &&
        (isSignedIn ? (
          <UserButton afterSignOutUrl="/" />
        ) : (
          <SignInButton mode="modal">
            <button className="h-8 px-3 text-xs font-medium rounded-[var(--r-md)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-all">
              Sign in to save
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
