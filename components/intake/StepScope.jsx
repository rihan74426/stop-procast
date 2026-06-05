"use client";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { FiCheck } from "react-icons/fi";

// ─── Scope definitions ────────────────────────────────────────────────
const SCOPES = [
  {
    id: "lean",
    labelKey: "scope_lean_label",
    hintKey: "scope_lean_hint",
    accent: "var(--emerald)",
    accentBg: "var(--emerald-bg)",
  },
  {
    id: "standard",
    labelKey: "scope_standard_label",
    hintKey: "scope_standard_hint",
    accent: "var(--violet)",
    accentBg: "var(--violet-bg)",
  },
  {
    id: "ambitious",
    labelKey: "scope_ambitious_label",
    hintKey: "scope_ambitious_hint",
    accent: "var(--amber)",
    accentBg: "var(--amber-bg)",
  },
];

// ─── Component ────────────────────────────────────────────────────────
// Props: value, onChange, onBack, onNext
// NOTE: previously this component used a `scope` prop — the parent
// (app/new/page.jsx) correctly passes `value`. Both are supported below.
export function StepScope({
  value,
  scope, // legacy alias — prefer value
  onChange = () => {},
  onBack,
  onNext,
}) {
  const { t } = useI18n();
  const selected = value ?? scope ?? "standard";

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl sm:text-3xl font-display font-semibold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          {t("intake_scope")}
        </h1>
        <p
          className="text-sm sm:text-base"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("intake_scope_desc")}
        </p>
      </div>

      {/* Scope cards */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
        {SCOPES.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className="relative text-left rounded-[var(--r-lg)] border-2 p-4 sm:p-5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                borderColor: isSelected
                  ? opt.accent
                  : "color-mix(in srgb, var(--text-tertiary) 30%, transparent)",
                background: isSelected ? opt.accentBg : "var(--bg-elevated)",
                boxShadow: isSelected
                  ? `0 0 0 1px ${opt.accent}22, 0 4px 12px ${opt.accent}18`
                  : "none",
                "--tw-ring-color": opt.accent,
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = opt.accent;
                  e.currentTarget.style.background = opt.accentBg;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor =
                    "color-mix(in srgb, var(--text-tertiary) 30%, transparent)";
                  e.currentTarget.style.background = "var(--bg-elevated)";
                }
              }}
              aria-pressed={isSelected}
            >
              {/* Selected check */}
              {isSelected && (
                <span
                  className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: opt.accent }}
                >
                  <FiCheck size={11} color="white" strokeWidth={2.5} />
                </span>
              )}

              <p
                className="font-display font-semibold text-base sm:text-lg mb-1"
                style={{
                  color: isSelected ? opt.accent : "var(--text-primary)",
                }}
              >
                {t(opt.labelKey)}
              </p>
              <p
                className="text-xs sm:text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {t(opt.hintKey)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack} type="button">
          {t("common_back")}
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={onNext}
          disabled={!selected}
          type="button"
          className="flex-1 sm:flex-none justify-center"
        >
          {t("intake_generate")}
        </Button>
      </div>
    </div>
  );
}
