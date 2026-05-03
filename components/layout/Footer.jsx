"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-elevated)] mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Main footer content */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 sm:gap-8">
          {/* Brand */}
          <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-[var(--r-sm)] bg-[var(--violet)] flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src="/logo.png"
                  alt="Momentum"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
              <span className="font-display font-semibold text-sm text-[var(--text-primary)]">
                Momentum
              </span>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] max-w-[240px] leading-relaxed">
              Turn ideas, learning, experiments and habits into clear plans and
              consistent progress.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center sm:justify-end items-center gap-x-5 gap-y-2">
            <Link
              href="/"
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/new"
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              New Project
            </Link>
            <Link
              href="/settings"
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Settings
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 sm:my-6 border-t border-[var(--border-subtle)]" />

        {/* Bottom row: copyright + developer CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs text-[var(--text-tertiary)] order-2 sm:order-1">
            © {new Date().getFullYear()} Momentum. All rights reserved.
          </p>

          {/* Developer CTA */}
          <a
            href="https://nuruddin-webician.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="group order-1 sm:order-2 flex items-center gap-2.5 px-4 py-2 rounded-[var(--r-full)] border border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--violet)] hover:bg-[var(--violet-bg)] transition-all duration-200"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--violet)] to-[var(--emerald)] flex items-center justify-center shrink-0">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 5h6M5 2l3 3-3 3"
                  stroke="white"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--violet-dim)] transition-colors font-medium">
              Built by{" "}
              <span className="text-[var(--text-primary)] group-hover:text-[var(--violet-dim)]">
                Nuruddin
              </span>
            </span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              className="text-[var(--text-tertiary)] group-hover:text-[var(--violet)] transition-colors group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transform"
            >
              <path
                d="M2.5 7.5L7.5 2.5M7.5 2.5H4M7.5 2.5V6"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
