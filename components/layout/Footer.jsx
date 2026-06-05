"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { FiArrowUpRight } from "react-icons/fi";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer
      className="border-t mt-auto"
      style={{
        background: "var(--bg-elevated)",
        borderColor: "var(--border)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 sm:gap-8">
          {/* Brand */}
          <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-[var(--r-sm)] flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src="/favicon.png"
                  alt="Momentum"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
              <span
                className="font-display font-semibold text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                Momentum
              </span>
            </div>
            <p
              className="text-xs max-w-[240px] leading-relaxed"
              style={{ color: "var(--text-tertiary)" }}
            >
              {t("footer_tagline")}
            </p>
          </div>

          {/* Nav links */}
          <div className="flex flex-wrap justify-center sm:justify-end items-center gap-x-5 gap-y-2">
            {[
              { href: "/", label: t("nav_dashboard") },
              { href: "/new", label: t("nav_new_project") },
              { href: "/settings", label: t("nav_settings") },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs transition-colors"
                style={{ color: "var(--text-tertiary)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--text-secondary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-tertiary)")
                }
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div
          className="my-5 sm:my-6 border-t"
          style={{ borderColor: "var(--border-subtle)" }}
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p
            className="text-xs order-2 sm:order-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            {t("footer_copyright", { year: String(new Date().getFullYear()) })}
          </p>

          {/* Built by link */}
          <a
            href="https://nuruddin-webician.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="group order-1 sm:order-2 flex items-center gap-2.5 px-4 py-2 rounded-[var(--r-full)] border transition-all duration-200"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-surface)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--violet)";
              e.currentTarget.style.background = "var(--violet-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.background = "var(--bg-surface)";
            }}
          >
            {/* Avatar circle */}
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, var(--violet), var(--emerald))",
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path
                  d="M1 4h6M4 1l3 3-3 3"
                  stroke="white"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <span
              className="text-xs font-medium transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("footer_built_by")}{" "}
              <span style={{ color: "var(--text-primary)" }}>Nuruddin</span>
            </span>

            <FiArrowUpRight
              size={10}
              className="transition-all duration-200"
              style={{ color: "var(--text-tertiary)" }}
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
