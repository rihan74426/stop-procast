"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import { FiArrowRight } from "react-icons/fi";

export function EmptyState() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-6 text-center">
      {/* Icon */}
      <Link href="/new" className="mb-8 block group">
        <div
          className="w-20 h-20 rounded-[var(--r-xl)] flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_8px_24px_color-mix(in_srgb,var(--violet)_25%,transparent)]"
          style={{
            background: "var(--violet-bg)",
            border:
              "1.5px solid color-mix(in srgb, var(--violet) 30%, transparent)",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M5 16h22M16 5l11 11-11 11"
              stroke="var(--violet)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </Link>

      <h2
        className="font-display font-semibold text-2xl mb-3"
        style={{ color: "var(--text-primary)" }}
      >
        {t("empty_state_title")}
      </h2>
      <p
        className="max-w-sm leading-relaxed mb-8 text-sm sm:text-base"
        style={{ color: "var(--text-secondary)" }}
      >
        {t("empty_state_desc")}
      </p>

      <Link href="/new">
        <Button size="lg" className="gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1v12M1 7h12"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          {t("empty_state_cta")}
        </Button>
      </Link>

      <p className="mt-5 text-xs" style={{ color: "var(--text-tertiary)" }}>
        {t("empty_state_hint")}
      </p>
    </div>
  );
}
